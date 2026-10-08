import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ensureProfile, requireUser } from "@/lib/auth";
import { spentPerCategory, weeklySeries } from "@/lib/insights/compute";
import { loadInsightData } from "@/lib/insights/queries";
import { amsterdamToday, currentPeriod } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { PotjeDetail, type DetailTransaction } from "./potje-detail";

export const metadata: Metadata = { title: "Potje" };

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

  const catMap = new Map(insight.cats.map((c) => [c.id, c]));
  const spent = spentPerCategory(insight.txs, catMap, period.startISO, period.endISO).get(category.id) ?? 0;
  const series = weeklySeries(insight.txs, catMap, category.id, today);

  const { data: rows } = await supabase
    .from("transactions")
    .select("id, booking_date, amount, own_share, counterparty, description")
    .eq("category_id", category.id)
    .order("booking_date", { ascending: false })
    .limit(60);

  const transactions: DetailTransaction[] = (rows ?? []).map((t) => ({
    id: t.id,
    bookingDate: t.booking_date,
    amount: Number(t.amount),
    ownShare: t.own_share === null ? null : Number(t.own_share),
    counterparty: t.counterparty ?? "Onbekende tegenpartij",
    description: t.description,
    inPeriod: t.booking_date >= period.startISO && t.booking_date < period.endISO,
  }));

  const others = insight.cats
    .filter((c) => c.id !== category.id && !c.systemKey)
    .map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }));

  return (
    <>
      <PageHeader title={category.name} backHref="/overzicht" />
      <PotjeDetail
        category={{
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          isIncome: category.is_income,
          monthlyBudget: category.monthly_budget === null ? null : Number(category.monthly_budget),
        }}
        spent={spent}
        periodLabel={period.label}
        series={series}
        transactions={transactions}
        otherCategories={others}
      />
    </>
  );
}
