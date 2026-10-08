import type { Metadata } from "next";
import Link from "next/link";
import { ConnectionBanner } from "@/components/bank/connection-banner";
import { RefreshButton } from "@/components/bank/refresh-button";
import { CategoryBadge } from "@/components/categories/category-badge";
import { BalanceButton } from "@/components/overview/balance-button";
import { MonthDonut } from "@/components/overview/month-donut";
import { MonthSeen } from "@/components/overview/month-seen";
import { StreakChip } from "@/components/overview/streak-chip";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { ensureProfile, requireUser } from "@/lib/auth";
import { getPrimaryConnection, statusFor } from "@/lib/bank/connections";
import { VOORGESCHOTEN_CATEGORY } from "@/lib/categories/types";
import { formatDayShort, formatEuro, formatEuroWhole } from "@/lib/format";
import { compareWithAverage, dailyStreak, previousPeriods, spentPerCategory } from "@/lib/insights/compute";
import { loadAccountBalances, loadInsightData } from "@/lib/insights/queries";
import { amsterdamToday, currentPeriod } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { getOpenShares } from "@/lib/transactions/queries";
import { cn } from "@/lib/utils";
import { SharesList } from "../potjes/shares-list";

export const metadata: Metadata = { title: "Overzicht" };

/** Zoveel maanden terug kun je bladeren (de geladen historie dekt dit). */
const MAX_BACK = 3;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function OverzichtPage({ searchParams }: PageProps<"/overzicht">) {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const supabase = await createClient();
  const params = await searchParams;
  const today = amsterdamToday();

  const requested = Number(Array.isArray(params.maand) ? params.maand[0] : params.maand);
  const back = Number.isInteger(requested) ? Math.min(Math.max(requested, 0), MAX_BACK) : 0;
  const current = currentPeriod(profile.salary_day, today);
  const period = back === 0 ? current : previousPeriods(profile.salary_day, today, back)[back - 1];

  const [connection, insight, accounts, openShares] = await Promise.all([
    getPrimaryConnection(supabase, user.id),
    loadInsightData(supabase, today),
    loadAccountBalances(supabase),
    getOpenShares(),
  ]);

  const catMap = new Map(insight.cats.map((c) => [c.id, c]));
  const perCategory = spentPerCategory(insight.txs, catMap, period.startISO, period.endISO);
  const slices = [...perCategory.entries()]
    .map(([id, amount]) => {
      const cat = catMap.get(id);
      return cat ? { id, name: cat.name, icon: cat.icon, color: cat.color, amount } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null && s.amount > 0);
  const total = slices.reduce((a, s) => a + s.amount, 0);
  const streak = dailyStreak(insight.txs, today);
  const comparison = back === 0 ? compareWithAverage(insight.txs, catMap, profile.salary_day, today) : null;
  const openSharesTotal = openShares.reduce((a, s) => a + s.amount, 0);
  const canRefresh = connection !== null && ["active", "expiring"].includes(statusFor(connection));
  const justConnected = params.bank === "gekoppeld";

  let compareLine: { text: string; tone: "muted" | "positive" | "accent" } | null = null;
  if (comparison && comparison.average !== null && total > 0) {
    const diff = Math.round((comparison.current - comparison.average) * 100) / 100;
    if (Math.abs(diff) < 1) compareLine = { text: "Precies je gemiddelde tot nu toe", tone: "muted" };
    else if (diff < 0) compareLine = { text: `${formatEuro(-diff)} minder dan normaal tot nu toe`, tone: "positive" };
    else compareLine = { text: `${formatEuro(diff)} meer dan normaal tot nu toe`, tone: "accent" };
  }

  // Lopende maand: "Sinds 25 september". Afgelopen maand: "25 aug – 24 sep".
  const lastDay = new Date(period.end);
  lastDay.setDate(lastDay.getDate() - 1);
  const title = back === 0 ? capitalize(period.label) : `${formatDayShort(period.start)} – ${formatDayShort(lastDay)}`;

  const navClass = "flex size-11 items-center justify-center rounded-full text-text hover:bg-surface-muted";

  return (
    <>
      {back === 1 && profile.month_review_seen_for !== current.startISO && <MonthSeen periodStartISO={current.startISO} />}

      <header className="safe-top flex items-center gap-1 px-2 pt-6 pb-2">
        {back < MAX_BACK ? (
          <Link href={`/overzicht?maand=${back + 1}`} aria-label="Vorige maand" className={navClass}>
            <IconChevronLeft />
          </Link>
        ) : (
          <span className="size-11" aria-hidden />
        )}
        <h1 className="min-w-0 flex-1 truncate text-center text-xl font-semibold tracking-tight">{title}</h1>
        {back > 0 ? (
          <Link href={back === 1 ? "/overzicht" : `/overzicht?maand=${back - 1}`} aria-label="Volgende maand" className={navClass}>
            <IconChevronRight />
          </Link>
        ) : (
          <span className="size-11" aria-hidden />
        )}
      </header>

      <div className="flex items-center justify-center gap-2 pb-4">
        <StreakChip days={streak.days} todayDone={streak.todayDone} />
        <BalanceButton accounts={accounts} />
      </div>

      <div className="flex flex-col gap-4 px-4">
        {justConnected && (
          <p className="rounded-control bg-positive-soft px-4 py-3 text-sm text-positive" role="status">
            Bank gekoppeld. Je transacties komen vanaf nu vanzelf binnen.
          </p>
        )}
        <ConnectionBanner connection={connection} />

        {connection === null && insight.txs.length === 0 ? (
          <Card padding="lg" className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold">Koppel je bank</h2>
              <p className="mt-1 text-sm text-text-muted">Dan komen je eerste kaartjes vanzelf binnen.</p>
            </div>
            <ButtonLink href="/bank/koppelen" size="lg" fullWidth>
              Bank koppelen
            </ButtonLink>
          </Card>
        ) : slices.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="font-medium">Nog niets in een potje</p>
            <p className="mt-1 text-sm text-text-muted">
              {back === 0 ? "Zet je kaartjes in een potje, dan zie je hier waar je geld heen gaat." : "In deze maand is niets in een potje gezet."}
            </p>
          </Card>
        ) : (
          <>
            <MonthDonut slices={slices} total={total} label={period.label} />
            {compareLine && (
              <p
                className={cn(
                  "-mt-1 text-center text-sm",
                  compareLine.tone === "positive" ? "text-positive" : compareLine.tone === "accent" ? "text-accent" : "text-text-muted",
                )}
              >
                {compareLine.text}
              </p>
            )}
          </>
        )}

        {openSharesTotal > 0 && back === 0 && (
          <Card padding="none">
            <div className="flex items-center gap-3 px-4 py-3">
              <CategoryBadge icon={VOORGESCHOTEN_CATEGORY.icon} color={VOORGESCHOTEN_CATEGORY.color} size="sm" />
              <h2 className="flex-1 font-medium">Nog te krijgen</h2>
              <p className="text-sm font-medium tabular-nums">{formatEuroWhole(openSharesTotal)}</p>
            </div>
            <div className="border-t">
              <SharesList shares={openShares} />
            </div>
          </Card>
        )}

        {canRefresh && back === 0 && (
          <div className="flex justify-center">
            <RefreshButton lastSyncedAt={connection.last_synced_at ?? null} />
          </div>
        )}
      </div>
    </>
  );
}
