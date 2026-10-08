import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConnectionBanner } from "@/components/bank/connection-banner";
import { RefreshButton } from "@/components/bank/refresh-button";
import { CategoryBadge } from "@/components/categories/category-badge";
import { BalanceButton } from "@/components/overview/balance-button";
import { MonthDonut, type DonutSlice } from "@/components/overview/month-donut";
import { MonthSeen } from "@/components/overview/month-seen";
import { MonthViewed } from "@/components/overview/month-viewed";
import { capitalize, compareLine, openCardsText, periodMonthName, periodSubtitle } from "@/components/overview/overview-copy";
import { StillToReceive } from "@/components/overview/still-to-receive";
import { StreakChip } from "@/components/overview/streak-chip";
import { BudgetBar } from "@/components/ui/budget-bar";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconBank, IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { ACTION_LABEL } from "@/config/app";
import { ensureProfile, requireUser } from "@/lib/auth";
import { getPrimaryConnection, statusFor } from "@/lib/bank/connections";
import { categoryColorClasses } from "@/lib/categories/palette";
import { formatEuroWhole } from "@/lib/format";
import { budgetLabel, budgetStatus } from "@/lib/insights/budget";
import {
  categoryDeviations,
  compareWithAverage,
  dailyStreak,
  pickStandout,
  previousPeriods,
  spendOf,
  spentPerCategory,
} from "@/lib/insights/compute";
import { loadAccountBalances, loadInsightData } from "@/lib/insights/queries";
import { amsterdamToday, currentPeriod } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { countOpenTransactions, getOpenShares } from "@/lib/transactions/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Overzicht" };

/** Zoveel maanden terug kun je bladeren (de geladen historie dekt dit). */
const MAX_BACK = 3;

const roundIcon =
  "flex size-11 items-center justify-center rounded-full text-text transition-colors duration-150 hover:bg-surface-muted";

export default async function OverzichtPage({ searchParams }: PageProps<"/overzicht">) {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const supabase = await createClient();
  const params = await searchParams;
  const today = amsterdamToday();

  const requested = Number(Array.isArray(params.maand) ? params.maand[0] : params.maand);
  const back = Number.isInteger(requested) ? Math.min(Math.max(requested, 0), MAX_BACK) : 0;
  const isCurrent = back === 0;
  const current = currentPeriod(profile.salary_day, today);
  const period = isCurrent ? current : previousPeriods(profile.salary_day, today, back)[back - 1];
  const justConnected = params.bank === "gekoppeld";

  const [connection, insight, accounts, openShares, openCount] = await Promise.all([
    getPrimaryConnection(supabase, user.id),
    loadInsightData(supabase, today),
    loadAccountBalances(supabase),
    getOpenShares(),
    countOpenTransactions().catch(() => 0),
  ]);

  const catMap = new Map(insight.cats.map((c) => [c.id, c]));
  const streak = dailyStreak(insight.txs, today);
  const noBank = connection === null && insight.txs.length === 0;

  // Uitgaven per potje en op kaartjes die nog in geen potje zitten.
  const perCategory = spentPerCategory(insight.txs, catMap, period.startISO, period.endISO);
  let unsorted = 0;
  for (const tx of insight.txs) {
    if (tx.categoryId !== null || tx.bookingDate < period.startISO || tx.bookingDate >= period.endISO) continue;
    unsorted += spendOf(tx, catMap);
  }
  unsorted = Math.max(0, Math.round(unsorted * 100) / 100);

  const slices: DonutSlice[] = [];
  for (const [id, amount] of perCategory) {
    const cat = catMap.get(id);
    if (cat && amount > 0) slices.push({ id, name: cat.name, color: cat.color, amount });
  }
  const sortedTotal = slices.reduce((sum, s) => sum + s.amount, 0);
  const total = Math.round((sortedTotal + unsorted) * 100) / 100;

  // Lijst: potjes met uitgaven of met een budget, grootste bedrag eerst. Geen procenten.
  const rows = insight.cats
    .filter((c) => !c.isIncome && !c.systemKey)
    .map((cat) => {
      const amount = Math.max(0, perCategory.get(cat.id) ?? 0);
      const budget = cat.monthlyBudget !== null && cat.monthlyBudget > 0 ? budgetStatus(amount, cat.monthlyBudget) : null;
      return { cat, amount, budget };
    })
    .filter((row) => row.amount > 0 || row.budget !== null)
    .sort((a, b) => b.amount - a.amount);

  const comparison = isCurrent ? compareWithAverage(insight.txs, catMap, profile.salary_day, today) : null;
  const compare = slices.length > 0 ? compareLine(comparison) : null;
  const standout =
    isCurrent && comparison ? pickStandout(categoryDeviations(insight.txs, catMap, profile.salary_day, today), comparison.daysElapsed) : null;
  const standoutCat = standout ? catMap.get(standout.categoryId) : undefined;

  const canRefresh = connection !== null && ["active", "expiring"].includes(statusFor(connection));
  const monthName = periodMonthName(period);
  const subtitle = periodSubtitle(period, today, isCurrent, Boolean(profile.salary_day));

  return (
    <>
      <MonthViewed monthsBack={back} />
      {back === 1 && profile.month_review_seen_for !== current.startISO && <MonthSeen periodStartISO={current.startISO} />}

      {/* Kopregel: streak links, zoeken en saldo rechts. */}
      <div className="safe-top">
        <div className="mt-2 flex h-11 items-center justify-between px-4">
          <StreakChip days={streak.days} />
          <div className="ml-auto flex items-center gap-1">
            <Link href="/transacties" aria-label="Zoeken in je transacties" className={roundIcon}>
              <Search size={20} aria-hidden />
            </Link>
            <BalanceButton accounts={accounts} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-4 pt-3">
        {/* Maandtitel met bladeren. */}
        <header>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">{capitalize(monthName)}</h1>
              <p className="text-[13px] text-text-muted">{subtitle}</p>
            </div>
            <nav aria-label="Maand kiezen" className="-mr-2 flex shrink-0 items-center">
              {back < MAX_BACK ? (
                <Link href={`/overzicht?maand=${back + 1}`} aria-label="Vorige maand" className={roundIcon}>
                  <IconChevronLeft size={22} />
                </Link>
              ) : (
                <span aria-hidden className={cn(roundIcon, "text-text-muted opacity-40 hover:bg-transparent")}>
                  <IconChevronLeft size={22} />
                </span>
              )}
              {back > 0 ? (
                <Link
                  href={back === 1 ? "/overzicht" : `/overzicht?maand=${back - 1}`}
                  aria-label="Volgende maand"
                  className={roundIcon}
                >
                  <IconChevronRight size={22} />
                </Link>
              ) : (
                <span aria-hidden className={cn(roundIcon, "text-text-muted opacity-40 hover:bg-transparent")}>
                  <IconChevronRight size={22} />
                </span>
              )}
            </nav>
          </div>
          {isCurrent && !noBank && openCount === 0 && <p className="mt-2 text-[15px] text-text-muted">Alles zit in een potje.</p>}
        </header>

        {justConnected && (
          <p className="rounded-card bg-positive-soft px-4 py-3 text-[15px] text-positive" role="status">
            Bank gekoppeld. Nieuwe betalingen komen vanzelf binnen.
          </p>
        )}

        {/* Alleen bij een verlopen of bijna verlopen koppeling; zonder bank staat de lege staat er al. */}
        {connection !== null && <ConnectionBanner connection={connection} />}

        {noBank ? (
          <Card padding="none">
            <EmptyState
              icon={<IconBank />}
              title="Nog geen bank gekoppeld"
              description="Koppel je bank, dan komen je betalingen vanzelf binnen als kaartjes."
              action={
                <ButtonLink href="/bank/koppelen?next=/overzicht" size="lg">
                  Bank koppelen
                </ButtonLink>
              }
              footnote="Alleen lezen. Wij kunnen nooit geld overmaken."
            />
          </Card>
        ) : (
          <>
            {/* Takenstrook: wat er nog te doen is. */}
            {isCurrent && openCount > 0 && (
              <div className="flex items-center gap-3 rounded-card bg-primary-soft px-4 py-3">
                <p className="flex-1 text-[15px] font-medium">{openCardsText(openCount)}</p>
                <Link
                  href="/swipen"
                  className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-semibold text-on-primary transition-transform duration-100 active:scale-[0.96]"
                >
                  {ACTION_LABEL}
                </Link>
              </div>
            )}

            {slices.length === 0 ? (
              <Card padding="lg" className="text-center">
                <p className="text-[15px] text-text-muted">
                  {isCurrent
                    ? `Deze maand nog niets uitgegeven.${openCount > 0 ? " Of je hebt nog kaartjes liggen." : ""}`
                    : `In ${monthName} is niets in een potje gezet.`}
                </p>
              </Card>
            ) : (
              <section aria-label="Uitgaven deze maand" className="flex flex-col items-center gap-3">
                <MonthDonut slices={slices} unsorted={unsorted} total={total} label={monthName} />
                {compare?.kind === "chip" && (
                  <p
                    className={cn(
                      "mx-auto inline-flex h-7 items-center rounded-full px-3 text-[13px] font-medium",
                      compare.tone === "positive" && "bg-positive-soft text-positive",
                      compare.tone === "accent" && "bg-accent-soft text-accent",
                      compare.tone === "neutral" && "bg-surface-muted text-text",
                    )}
                  >
                    {compare.text}
                  </p>
                )}
                {compare?.kind === "note" && <p className="text-center text-[13px] text-text-muted">{compare.text}</p>}
              </section>
            )}

            {standout && standoutCat && (
              <Link
                href={`/potjes/${standoutCat.id}`}
                className="-my-3 flex min-h-11 items-center gap-2 rounded-control px-1 text-[13px] transition-colors duration-150 hover:bg-surface-muted"
              >
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{standoutCat.name}:</span>{" "}
                  <span className="text-text-muted">
                    {formatEuroWhole(Math.abs(standout.diff))} {standout.diff > 0 ? "meer" : "minder"} dan je gemiddelde
                  </span>
                </span>
                <IconChevronRight size={16} className="shrink-0 text-text-muted" />
              </Link>
            )}

            {rows.length > 0 && (
              <Card padding="none">
                <ul className="divide-y">
                  {rows.map(({ cat, amount, budget }) => {
                    const colors = categoryColorClasses(cat.color);
                    return (
                      <li key={cat.id}>
                        <Link
                          href={`/potjes/${cat.id}`}
                          className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-muted"
                        >
                          <CategoryBadge icon={cat.icon} color={cat.color} size="row" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-medium">{cat.name}</span>
                            {budget && (
                              <BudgetBar ratio={budget.ratio} over={budget.state === "over"} colorClass={colors.solid} className="mt-1.5" />
                            )}
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-[15px] font-semibold tabular-nums">{formatEuroWhole(amount)}</span>
                            {budget && (
                              <span
                                className={cn(
                                  "block text-[12px] tabular-nums",
                                  budget.state === "over" ? "text-accent" : "text-text-muted",
                                )}
                              >
                                {budgetLabel(budget)}
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}

            {isCurrent && <StillToReceive shares={openShares} />}

            <Link
              href="/transacties"
              className="-my-3 flex min-h-11 items-center justify-between rounded-control px-1 text-[15px] font-medium text-primary transition-colors duration-150 hover:bg-surface-muted"
            >
              Alle transacties
              <IconChevronRight size={18} />
            </Link>

            {canRefresh && isCurrent && <RefreshButton lastSyncedAt={connection.last_synced_at ?? null} />}
          </>
        )}
      </div>
    </>
  );
}
