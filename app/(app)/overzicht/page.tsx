import { ChartColumn, Repeat, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConnectionBanner } from "@/components/bank/connection-banner";
import { RefreshButton } from "@/components/bank/refresh-button";
import { CashWalletRow } from "@/components/cash/cash-wallet-row";
import { CategoryBadge } from "@/components/categories/category-badge";
import { BalanceButton } from "@/components/overview/balance-button";
import { FreeToSpendCard } from "@/components/overview/free-to-spend";
import { MonthLeftCard } from "@/components/overview/month-left-card";
import { IncomeView, type IncomeGroup } from "@/components/overview/income-view";
import { MonthClosingSheet } from "@/components/overview/month-closing";
import { SpendBar, type SpendSlice } from "@/components/overview/spend-bar";
import { MonthSeen } from "@/components/overview/month-seen";
import { MonthViewed } from "@/components/overview/month-viewed";
import {
  capitalize,
  compareLine,
  openCardsText,
  periodMonthName,
  periodSubtitle,
} from "@/components/overview/overview-copy";
import { PotjeProgress } from "@/components/overview/potje-progress";
import { SavingsSection, type SavingsItem } from "@/components/overview/savings-section";
import { StillToReceive } from "@/components/overview/still-to-receive";
import { StreakChip } from "@/components/overview/streak-chip";
import { ViewSwitch, overviewHref, type OverviewView } from "@/components/overview/view-switch";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { IconBank, IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { ACTION_LABEL } from "@/config/app";
import { ensureProfile, requireUser } from "@/lib/auth";
import { getPrimaryConnection, statusFor } from "@/lib/bank/connections";
import { categoryColorClasses } from "@/lib/categories/palette";
import { formatEuroWhole, formatLongDate } from "@/lib/format";
import { budgetLabel, budgetStatus } from "@/lib/insights/budget";
import { compareIncome, incomeTransactionsPerCategory, unsortedIncoming } from "@/lib/insights/charts";
import {
  compareWithAverage,
  dailyStreak,
  incomePerCategory,
  isExpenseCategory,
  previousPeriods,
  savedPerCategory,
  spendOf,
  spentPerCategory,
  totalIncome,
  totalSaved,
} from "@/lib/insights/compute";
import { loadFreeToSpendDetails } from "@/lib/insights/free-to-spend";
import { monthClosing } from "@/lib/insights/month-closing";
import { loadMonthLeft } from "@/lib/insights/fixed-month-server";
import { loadTrackingStart, overviewStartsOn } from "@/lib/insights/overview-start";
import { loadAccountBalances, loadInsightData } from "@/lib/insights/queries";
import { recurringMonthlyTotal } from "@/lib/insights/recurring";
import { amsterdamToday, currentPeriod } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { convertOpenSharesToTracking } from "@/lib/transactions/convert-shares";
import { countOpenTransactions, getAwaitingRefunds, getOpenShares } from "@/lib/transactions/queries";
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
  const view: OverviewView = params.weergave === "inkomsten" ? "inkomsten" : "uitgaven";
  const showIncome = view === "inkomsten";
  // Inkomsten vergelijken met de drie maanden vóór de getoonde: die moeten dan ook geladen zijn.
  const incomeSince = showIncome ? previousPeriods(profile.salary_day, today, back + 3).at(-1)?.startISO : undefined;

  // Halverwege de maand begonnen? Dan zegt het overzicht nog niets: het begint op de eerstvolgende
  // salarisdag. Wie toch wil kijken, kan dat (?toch=1); terugbladeren kan altijd.
  if (isCurrent && params.toch !== "1") {
    const startsOn = overviewStartsOn(await loadTrackingStart(supabase, user.id).catch(() => null), current);
    if (startsOn) {
      const [monthLeft, linked] = await Promise.all([
        loadMonthLeft(supabase, user.id, today).catch(() => null),
        getPrimaryConnection(supabase, user.id),
      ]);
      return (
        <>
          <PageHeader title="Overzicht" />
          <div className="px-4">
            <MonthLeftCard left={monthLeft} canSetUp={linked !== null} />
          </div>
          <EmptyState
            icon={<ChartColumn />}
            title={`Je overzicht begint op ${formatLongDate(startsOn)}`}
            description="Dan begint je eerste hele maand."
            action={<ButtonLink href="/swipen">Naar je stapel</ButtonLink>}
            footnote={
              <Link href="/overzicht?toch=1" className="underline underline-offset-2">
                Toch nu al kijken
              </Link>
            }
          />
        </>
      );
    }
  }

  // Oude verdelingen per persoon eerst omzetten naar bijhouden per uitgave.
  await convertOpenSharesToTracking().catch(() => 0);
  const [connection, insight, accounts, openShares, awaitingRefunds, openCount, fixed, monthLeft] = await Promise.all([
    getPrimaryConnection(supabase, user.id),
    loadInsightData(supabase, today, { since: incomeSince }),
    loadAccountBalances(supabase),
    getOpenShares(),
    getAwaitingRefunds().catch(() => []),
    countOpenTransactions().catch(() => 0),
    // Vaste kosten en "Nog over tot je salaris" alleen voor de lopende maand; mislukt het, dan staat er niets.
    isCurrent ? loadFreeToSpendDetails(supabase, user.id, today).catch(() => null) : null,
    // Nog over deze maand, uit de vaste maand die de gebruiker zelf heeft aangetikt.
    isCurrent ? loadMonthLeft(supabase, user.id, today).catch(() => null) : null,
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

  const slices: SpendSlice[] = [];
  for (const [id, amount] of perCategory) {
    const cat = catMap.get(id);
    if (cat && amount > 0) slices.push({ id, name: cat.name, color: cat.color, amount });
  }
  // Per potje de maand vóór de getoonde: het streepje "vorige maand" in de budgetbalk.
  const before = previousPeriods(profile.salary_day, today, back + 1)[back];
  const lastMonthPer = spentPerCategory(insight.txs, catMap, before.startISO, before.endISO);

  // Geld terug zonder potje: gaat van het totaal af, maar van geen potje (spendOf geeft het negatief).
  let refundsLoose = 0;
  for (const [id, amount] of perCategory) {
    if (catMap.get(id)?.systemKey === "terug" && amount < 0) refundsLoose -= amount;
  }
  refundsLoose = Math.round(refundsLoose * 100) / 100;

  const sortedTotal = slices.reduce((sum, s) => sum + s.amount, 0);
  const total = Math.max(0, Math.round((sortedTotal + unsorted - refundsLoose) * 100) / 100);

  // Lijst: potjes met uitgaven of met een budget, grootste bedrag eerst. Geen procenten.
  // Spaarpotjes staan hier niet: sparen is geen uitgeven (die staan in het blok Sparen).
  const rows = insight.cats
    .filter(isExpenseCategory)
    .map((cat) => {
      const amount = Math.max(0, perCategory.get(cat.id) ?? 0);
      const budget = cat.monthlyBudget !== null && cat.monthlyBudget > 0 ? budgetStatus(amount, cat.monthlyBudget) : null;
      return { cat, amount, budget };
    })
    .filter((row) => row.amount > 0 || row.budget !== null)
    .sort((a, b) => b.amount - a.amount);

  const comparison = isCurrent ? compareWithAverage(insight.txs, catMap, profile.salary_day, today) : null;
  const compare = slices.length > 0 ? compareLine(comparison) : null;

  // Maandafsluiting: één keer, bij het eerste openen in een nieuwe periode.
  const reviewSeen = profile.month_review_seen_for === current.startISO;
  const closing = back <= 1 && !reviewSeen && !noBank ? monthClosing(insight.txs, insight.cats, profile.salary_day, today) : null;
  const recurringTotal = fixed ? recurringMonthlyTotal(fixed.recurring) : 0;

  const monthName = periodMonthName(period);

  // Sparen: netto deze maand (voor de inkomsten-weergave) en per spaarpotje de stand. Een vorige
  // maand toont de stand aan het eind van die maand. Spaarpotjes laden met hun hele historie.
  const saved = totalSaved(insight.txs, catMap, period.startISO, period.endISO);
  const standPer = savedPerCategory(insight.txs, catMap, "", period.endISO);
  const savingsItems: SavingsItem[] = insight.cats
    .filter((c) => c.isSavings && !c.systemKey)
    .map((cat) => ({ cat, stand: standPer.get(cat.id) ?? 0 }));

  const canRefresh = connection !== null && ["active", "expiring"].includes(statusFor(connection));
  const subtitle = periodSubtitle(period, today, isCurrent, Boolean(profile.salary_day));
  const showTopRow = streak.days > 0 || accounts.length > 0;

  // Inkomsten-weergave: alleen inkomstenpotjes; Geld terug en Voorgeschoten tellen nooit als inkomen.
  let income: { total: number; groups: IncomeGroup[]; unsorted: number; comparison: ReturnType<typeof compareIncome> } | null = null;
  if (showIncome) {
    const perIncome = incomePerCategory(insight.txs, catMap, period.startISO, period.endISO);
    const incomeTxs = incomeTransactionsPerCategory(insight.txs, catMap, period.startISO, period.endISO);
    const groups = insight.cats
      .filter((c) => c.isIncome && !c.systemKey)
      .map((cat) => ({ cat, amount: perIncome.get(cat.id) ?? 0, txs: incomeTxs.get(cat.id) ?? [] }))
      .filter((g) => g.amount !== 0 || g.txs.length > 0)
      .sort((a, b) => b.amount - a.amount);
    // De lopende maand vergelijken we na even veel dagen, net als de uitgaven.
    const daysIn = isCurrent ? Math.round((today.getTime() - period.start.getTime()) / 864e5) + 1 : undefined;
    const earlier = previousPeriods(profile.salary_day, today, back + 3).slice(back);
    income = {
      total: totalIncome(insight.txs, catMap, period.startISO, period.endISO),
      groups,
      unsorted: unsortedIncoming(insight.txs, period.startISO, period.endISO),
      comparison: compareIncome(insight.txs, catMap, period, earlier, daysIn),
    };
  }

  return (
    <>
      <MonthViewed monthsBack={back} />
      {(back === 1 || closing) && !reviewSeen && <MonthSeen periodStartISO={current.startISO} />}
      {closing && (
        <MonthClosingSheet
          closing={closing}
          monthName={periodMonthName(previousPeriods(profile.salary_day, today, 1)[0])}
          // Geen focusvraag meer: de FocusCard staat niet meer op Overzicht, dus de keuze zou nergens te zien zijn.
          choices={[]}
        />
      )}

      {/* Kopregel: streak links, saldo rechts. Alleen als er iets te tonen is; zoeken staat bij de maandtitel. */}
      <div className="safe-top">
        {showTopRow && (
          <div className="mt-2 flex h-11 items-center justify-between px-4">
            <StreakChip days={streak.days} forgiven={streak.forgivenRecently} />
            <div className="ml-auto flex items-center gap-1">
              <BalanceButton accounts={accounts} />
            </div>
          </div>
        )}
      </div>

      <div className={cn("flex flex-col gap-6 px-4", showTopRow ? "pt-3" : "pt-4")}>
        {/* Maandtitel met bladeren. */}
        <header>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">{capitalize(monthName)}</h1>
              <p className="text-[13px] text-text-muted">{subtitle}</p>
            </div>
            <div className="-mr-2 flex shrink-0 items-center">
              <Link href="/transacties" aria-label="Zoeken in je kaartjes" className={roundIcon}>
                <Search size={20} aria-hidden />
              </Link>
              <nav aria-label="Maand kiezen" className="flex items-center">
                {back < MAX_BACK ? (
                  <Link href={overviewHref(back + 1, view)} aria-label="Vorige maand" className={roundIcon}>
                    <IconChevronLeft size={22} />
                  </Link>
                ) : (
                  <span aria-hidden className={cn(roundIcon, "text-text-muted opacity-40 hover:bg-transparent")}>
                    <IconChevronLeft size={22} />
                  </span>
                )}
                {back > 0 ? (
                  <Link
                    href={overviewHref(back - 1, view)}
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
          </div>
          {isCurrent && !noBank && openCount === 0 && <p className="mt-2 text-[15px] text-text-muted">Alles zit in een potje.</p>}
        </header>

        {!noBank && <ViewSwitch view={view} back={back} />}

        {justConnected && (
          <p className="rounded-card bg-positive-soft px-4 py-3 text-[15px] text-positive" role="status">
            Bank gekoppeld.
          </p>
        )}

        {/* Alleen bij een verlopen of bijna verlopen koppeling; zonder bank staat de lege staat er al. */}
        {connection !== null && <ConnectionBanner connection={connection} />}

        {noBank ? (
          <Card padding="none">
            <EmptyState
              icon={<IconBank />}
              title="Nog geen bank gekoppeld"
              description="Koppel je bank, dan komen je kaartjes vanzelf."
              action={
                <ButtonLink href="/bank/koppelen?next=/overzicht" size="lg">
                  Bank koppelen
                </ButtonLink>
              }
              footnote="We kijken alleen mee."
            />
          </Card>
        ) : (
          <>
            {/* Takenstrook: wat er nog te doen is. */}
            {isCurrent && openCount > 0 && (
              <div className="flex items-center gap-3 rounded-card bg-primary-soft px-4 py-3">
                <p className="flex-1 text-[15px] font-medium">{openCardsText(openCount)}</p>
                {/* Tikvlak 44 px hoog; de pil zelf blijft 36 px. */}
                <Link href="/swipen" className="group -my-1 flex h-11 shrink-0 items-center">
                  <span className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[15px] font-semibold text-on-primary transition-transform duration-100 group-active:scale-[0.96]">
                    {ACTION_LABEL}
                  </span>
                </Link>
              </div>
            )}

            {showIncome && income ? (
              <IncomeView
                monthName={monthName}
                isCurrent={isCurrent}
                total={income.total}
                spent={total}
                saved={saved}
                comparison={income.comparison}
                groups={income.groups}
                unsorted={income.unsorted}
                hasIncomePotje={insight.cats.some((c) => c.isIncome && !c.systemKey)}
              />
            ) : (
              <>
              {isCurrent && <CashWalletRow />}
              {/* Met een ingestelde vaste maand toont dat getal wat je over hebt; anders de schatting op je saldo. */}
              {isCurrent && (monthLeft || !fixed?.free) && <MonthLeftCard left={monthLeft} canSetUp={connection !== null} />}
              {isCurrent && !monthLeft && fixed?.free && <FreeToSpendCard free={fixed.free} />}

              {slices.length === 0 ? (
                <Card padding="lg" className="text-center">
                  <p className="text-[15px] text-text-muted">
                    {isCurrent
                      ? openCount > 0
                        ? "Deel eerst je kaartjes in."
                        : "Deze maand nog niets uitgegeven."
                      : `In ${monthName} is niets in een potje gezet.`}
                  </p>
                </Card>
              ) : (
                <section aria-label="Uitgaven deze maand" className="flex flex-col items-center gap-3">
                  <SpendBar slices={slices} unsorted={unsorted} total={total} label={monthName} />
                  {/* Onder het totaal alleen de vergelijking met je gemiddelde. */}
                  {compare?.kind === "chip" && (
                    <p
                      className={cn(
                        "mx-auto inline-flex min-h-7 items-center rounded-[14px] px-3 py-1 text-center text-[13px] leading-[18px] font-medium",
                        compare.tone === "positive" && "bg-positive-soft text-positive",
                        compare.tone === "accent" && "bg-accent-soft text-accent-strong",
                        compare.tone === "neutral" && "bg-surface-muted text-text",
                      )}
                    >
                      {compare.text}
                    </p>
                  )}
                  {compare?.kind === "note" && <p className="text-center text-[13px] text-text-muted">{compare.text}</p>}
                </section>
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
                              {/* Een balk alleen bij een budget; zonder budget is het bedrag genoeg. */}
                              {budget && (
                                <PotjeProgress
                                  amount={amount}
                                  budget={cat.monthlyBudget}
                                  lastMonth={Math.max(0, lastMonthPer.get(cat.id) ?? 0)}
                                  over={budget.state === "over"}
                                  colorClass={colors.solid}
                                  className="mt-1.5"
                                />
                              )}
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block text-[15px] font-semibold tabular-nums">{formatEuroWhole(amount)}</span>
                              {/* Het budgetlabel alleen als je erover zit. */}
                              {budget?.state === "over" && (
                                <span className="block text-[13px] leading-[18px] tabular-nums text-accent-strong">{budgetLabel(budget)}</span>
                              )}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              )}

              <SavingsSection items={savingsItems} />

              {isCurrent && <StillToReceive shares={openShares} awaiting={awaitingRefunds} />}

              {/* Met een ingestelde vaste maand staan je vaste kosten al in "Nog over". */}
              {isCurrent && !monthLeft && fixed && fixed.recurring.length > 0 && (
                <Link
                  href="/overzicht/vaste-lasten"
                  className="flex min-h-14 items-center gap-3 rounded-card bg-surface px-4 py-2.5 shadow-card transition-colors duration-150 hover:bg-surface-muted"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted text-text-muted" aria-hidden>
                    <Repeat size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium">Vaste kosten</span>
                    <span className="block text-[13px] leading-[18px] text-text-muted tabular-nums">
                      {formatEuroWhole(recurringTotal)} per maand
                    </span>
                  </span>
                  <IconChevronRight size={18} className="shrink-0 text-text-muted" />
                </Link>
              )}

              </>
            )}

            <Link
              href="/overzicht/inzicht"
              className="flex min-h-14 items-center gap-3 rounded-card bg-surface px-4 py-2.5 shadow-card transition-colors duration-150 hover:bg-surface-muted"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted text-text-muted" aria-hidden>
                <ChartColumn size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">Meer inzicht</span>
                <span className="block text-[13px] leading-[18px] text-text-muted">Grafieken over je laatste maanden</span>
              </span>
              <IconChevronRight size={18} className="shrink-0 text-text-muted" />
            </Link>

            {canRefresh && isCurrent && <RefreshButton lastSyncedAt={connection.last_synced_at ?? null} />}
          </>
        )}
      </div>
    </>
  );
}
