import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ensureProfile, requireUser } from "@/lib/auth";
import { spendOf, spentPerCategory, weeklySeries, type CatLite } from "@/lib/insights/compute";
import { loadInsightData } from "@/lib/insights/queries";
import { amsterdamToday, currentPeriod } from "@/lib/periods";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { CASH_COUNTERPARTY } from "@/lib/transactions/cash";
import { receivedPerExpense } from "@/lib/transactions/refunds";
import { splitPartLine } from "@/lib/transactions/split-parts";
import { DetailViewed } from "./detail-viewed";
import { PotjeDetail, type DetailTransaction } from "./potje-detail";

export const metadata: Metadata = { title: "Potje" };

const round2 = (value: number) => Math.round(value * 100) / 100;

export default async function PotjeDetailPage({ params }: PageProps<"/potjes/[id]">) {
  const { id } = await params;
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const supabase = await createClient();
  const today = amsterdamToday();
  const period = currentPeriod(profile.salary_day, today);

  const [{ data: category }, insight] = await Promise.all([
    supabase.from("categories").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    loadInsightData(supabase, today),
  ]);
  if (!category || category.system_key || category.archived) notFound();

  const goalAmount = category.goal_amount === null ? null : Number(category.goal_amount);
  const monthlyBudget = category.monthly_budget === null ? null : Number(category.monthly_budget);

  const catMap = new Map(insight.cats.map((c) => [c.id, c]));
  const series = weeklySeries(insight.txs, catMap, category.id, today);

  // Inkomen telt niet als uitgave; daar tonen we wat er deze maand binnenkwam.
  const spent = category.is_income
    ? round2(
        insight.txs
          .filter(
            (t) =>
              t.categoryId === category.id &&
              !t.isInternal &&
              t.bookingDate >= period.startISO &&
              t.bookingDate < period.endISO,
          )
          .reduce((sum, t) => sum + t.amount, 0),
      )
    : (spentPerCategory(insight.txs, catMap, period.startISO, period.endISO).get(category.id) ?? 0);

  // Gespaard = alles wat ooit in dit potje is gestopt, net zoals spendOf eigen delen telt.
  let saved: number | null = null;
  if (goalAmount !== null && !category.is_income) {
    const own: CatLite = {
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      isIncome: false,
      systemKey: null,
      monthlyBudget: null,
      goalAmount,
    };
    const ownMap = new Map([[own.id, own]]);
    const all = await fetchAll((from, to) =>
      supabase
        .from("transactions")
        .select("id, booking_date, amount, own_share, created_at, categorized_at, is_internal_transfer")
        .eq("category_id", category.id)
        .order("id")
        .range(from, to),
    );
    saved = round2(
      all.reduce(
        (sum, row) =>
          sum +
          spendOf(
            {
              id: row.id,
              bookingDate: row.booking_date,
              amount: Number(row.amount),
              ownShare: row.own_share === null ? null : Number(row.own_share),
              categoryId: category.id,
              createdAt: row.created_at,
              categorizedAt: row.categorized_at,
              isInternal: row.is_internal_transfer,
            },
            ownMap,
          ),
        0,
      ),
    );
  }

  const { data: rows } = await supabase
    .from("transactions")
    .select(
      "id, booking_date, booking_time, amount, own_share, counterparty, description, raw_counterparty, raw_description, note, source, awaiting_refund, refund_for_id, split_parent_id",
    )
    .eq("category_id", category.id)
    .order("booking_date", { ascending: false })
    .limit(60);

  // Geld terug bijhouden: per uitgave wat er al terug is, en bij een terugbetaling waar hij bij hoort.
  const expenseIds = (rows ?? []).filter((t) => Number(t.amount) < 0).map((t) => t.id);
  // Terugbetalingen en delen wijzen naar een andere regel: die halen we in één keer op.
  const refundForIds = [
    ...new Set((rows ?? []).flatMap((t) => [t.refund_for_id, t.split_parent_id].filter((id): id is string => id !== null))),
  ];
  const [{ data: linkedRefunds }, { data: refundTargets }] = await Promise.all([
    expenseIds.length > 0
      ? supabase.from("transactions").select("refund_for_id, amount").in("refund_for_id", expenseIds)
      : Promise.resolve({ data: [] as { refund_for_id: string | null; amount: number }[] }),
    refundForIds.length > 0
      ? supabase.from("transactions").select("id, counterparty, amount").in("id", refundForIds)
      : Promise.resolve({ data: [] as { id: string; counterparty: string | null; amount: number }[] }),
  ]);
  const receivedFor = receivedPerExpense(
    (linkedRefunds ?? []).map((r) => ({ refundForId: r.refund_for_id, amount: Number(r.amount) })),
  );
  const targetName = new Map((refundTargets ?? []).map((t) => [t.id, t.counterparty?.trim() || "Onbekende tegenpartij"]));
  const targetAmount = new Map((refundTargets ?? []).map((t) => [t.id, Number(t.amount)]));

  const transactions: DetailTransaction[] = (rows ?? []).map((t) => {
    // Contante uitgave: geen bank en geen banktekst, alleen eventueel de korte notitie van het verdelen.
    const isCash = t.source === "cash";
    // Deel van een verdeelde afschrijving: ook geen eigen banktekst; wel waar het deel van is.
    const parentName = t.split_parent_id ? targetName.get(t.split_parent_id) : undefined;
    const splitOf =
      t.split_parent_id && parentName !== undefined
        ? splitPartLine(parentName, targetAmount.get(t.split_parent_id) ?? 0)
        : null;
    return {
      id: t.id,
      bookingDate: t.booking_date,
      amount: Number(t.amount),
      ownShare: t.own_share === null ? null : Number(t.own_share),
      counterparty: t.counterparty ?? (isCash ? CASH_COUNTERPARTY : "Onbekende tegenpartij"),
      rawCounterparty: isCash ? CASH_COUNTERPARTY : (t.raw_counterparty ?? t.counterparty ?? "Onbekende tegenpartij"),
      rawDescription: isCash
        ? t.description
          ? `Contant betaald: ${t.description}`
          : "Contant betaald"
        : splitOf
          ? [splitOf, t.description].filter(Boolean).join(": ")
          : (t.raw_description ?? t.description),
      bookingTime: t.booking_time ? t.booking_time.slice(0, 5) : null,
      note: t.note,
      cashNote: isCash || t.source === "split" ? t.description : null,
      splitOf,
      awaitingRefund: t.awaiting_refund,
      refundReceived: receivedFor.get(t.id) ?? 0,
      refundFor: t.refund_for_id ? (targetName.get(t.refund_for_id) ?? "een uitgave") : null,
      inPeriod: t.booking_date >= period.startISO && t.booking_date < period.endISO,
    };
  });

  const pickable = insight.cats
    .filter((c) => !c.systemKey)
    .map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }));

  return (
    <>
      {/* Meting op de client: een refresh na een actie telt niet als nieuw bezoek. */}
      <DetailViewed categoryId={category.id} />
      <PotjeDetail
        category={{
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          isIncome: category.is_income,
          monthlyBudget,
          goalAmount,
        }}
        spent={spent}
        saved={saved}
        periodLabel={period.label}
        series={series}
        transactions={transactions}
        pickableCategories={pickable}
      />
    </>
  );
}
