import type { Metadata } from "next";
import Link from "next/link";
import { ConnectionBanner } from "@/components/bank/connection-banner";
import { RefreshButton } from "@/components/bank/refresh-button";
import { CategoryIcon } from "@/components/categories/category-icon";
import { BalanceButton } from "@/components/overview/balance-button";
import { MonthReviewCard } from "@/components/overview/month-review-card";
import { SpendSummary } from "@/components/overview/spend-summary";
import { StreakChip } from "@/components/overview/streak-chip";
import { TopCategories } from "@/components/overview/top-categories";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ACTION_LABEL, ACTION_VERB } from "@/config/app";
import { ensureProfile, requireUser } from "@/lib/auth";
import { getPrimaryConnection, statusFor } from "@/lib/bank/connections";
import { VOORGESCHOTEN_CATEGORY } from "@/lib/categories/types";
import { formatEuroWhole } from "@/lib/format";
import { compareWithAverage, dailyStreak, monthReview, spentPerCategory } from "@/lib/insights/compute";
import { loadAccountBalances, loadInsightData } from "@/lib/insights/queries";
import { currentPeriod } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { getOpenShares } from "@/lib/transactions/queries";

export const metadata: Metadata = { title: "Overzicht" };

function greeting(name: string | null): string {
  const hour = new Date().getHours();
  const dagdeel = hour < 6 ? "Goedenacht" : hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  return name ? `${dagdeel}, ${name}` : dagdeel;
}

export default async function OverzichtPage({ searchParams }: PageProps<"/overzicht">) {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const supabase = await createClient();
  const params = await searchParams;
  const today = new Date();
  const period = currentPeriod(profile.salary_day, today);

  const [{ count }, connection, insight, accounts, openShares] = await Promise.all([
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .is("category_id", null)
      .eq("is_internal_transfer", false),
    getPrimaryConnection(supabase, user.id),
    loadInsightData(supabase, today),
    loadAccountBalances(supabase),
    getOpenShares(),
  ]);

  const catMap = new Map(insight.cats.map((c) => [c.id, c]));
  const comparison = compareWithAverage(insight.txs, catMap, profile.salary_day, today);
  const perCategory = spentPerCategory(insight.txs, catMap, period.startISO, period.endISO);
  const streak = dailyStreak(insight.txs, today);
  const review = profile.month_review_seen_for === period.startISO ? null : monthReview(insight.txs, insight.cats, profile.salary_day, today);
  const openSharesTotal = openShares.reduce((a, s) => a + s.amount, 0);

  const openCount = count ?? 0;
  const justConnected = params.bank === "gekoppeld";
  const canRefresh = connection !== null && ["active", "expiring"].includes(statusFor(connection));

  return (
    <>
      <header className="safe-top flex items-center justify-between gap-3 px-4 pt-6 pb-3">
        <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{greeting(profile.display_name)}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <StreakChip days={streak.days} todayDone={streak.todayDone} />
          <BalanceButton accounts={accounts} />
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4">
        {justConnected && (
          <p className="rounded-control bg-positive-soft px-4 py-3 text-sm text-positive" role="status">
            Bank gekoppeld. Je transacties komen vanaf nu vanzelf binnen.
          </p>
        )}
        <ConnectionBanner connection={connection} />

        {review && (
          <MonthReviewCard
            currentPeriodStart={period.startISO}
            review={{
              periodStartISO: review.period.startISO,
              periodEndISO: review.period.endISO,
              total: review.total,
              average: review.average,
              periodsUsed: review.periodsUsed,
              categories: review.categories.map((row) => ({
                id: row.category.id,
                name: row.category.name,
                icon: row.category.icon,
                color: row.category.color,
                spent: row.spent,
                average: row.average,
                budget: row.budget,
              })),
            }}
          />
        )}

        <Card padding="lg" className="flex flex-col gap-4">
          {openCount > 0 ? (
            <>
              <div>
                <p className="text-sm text-text-muted">Nog te {ACTION_VERB}</p>
                <p className="text-4xl font-semibold tabular-nums tracking-tight">{openCount}</p>
                <p className="mt-1 text-sm text-text-muted">
                  {openCount === 1 ? "transactie zoekt nog een potje" : "transacties zoeken nog een potje"}
                </p>
              </div>
              <ButtonLink href="/swipen" size="lg" fullWidth>
                {ACTION_LABEL}
              </ButtonLink>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-text-muted">Nog te {ACTION_VERB}</p>
                <p className="text-4xl font-semibold tabular-nums tracking-tight">0</p>
                <p className="mt-1 text-sm text-text-muted">Alles zit in een potje. Lekker bezig, kop koffie verdiend.</p>
              </div>
              <ButtonLink href="/swipen" variant="secondary" size="lg" fullWidth>
                Naar {ACTION_LABEL.toLowerCase()}
              </ButtonLink>
            </>
          )}
          {canRefresh && <RefreshButton lastSyncedAt={connection?.last_synced_at ?? null} />}
        </Card>

        <SpendSummary comparison={comparison} periodLabel={period.label} />

        <TopCategories cats={insight.cats} spent={perCategory} />

        {openSharesTotal > 0 && (
          <Link href="/potjes" className="flex items-center gap-3 rounded-card bg-surface px-4 py-3 shadow-card hover:bg-surface-muted">
            <span className="flex size-9 items-center justify-center rounded-full bg-cat-geel-soft text-cat-geel" aria-hidden>
              <CategoryIcon icon={VOORGESCHOTEN_CATEGORY.icon} size={18} />
            </span>
            <span className="flex-1 text-sm">
              <span className="font-medium">Nog {formatEuroWhole(openSharesTotal)} te krijgen</span>
              <span className="block text-text-muted">
                {openShares.length === 1 ? "1 deel staat open" : `${openShares.length} delen staan open`} in Voorgeschoten
              </span>
            </span>
          </Link>
        )}
      </div>
    </>
  );
}
