import { ChartColumn } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CategoryBadge } from "@/components/categories/category-badge";
import { ChartCard, ChartTable, Legend } from "@/components/insights/chart-parts";
import { CumulativeChart } from "@/components/insights/cumulative-chart";
import { FixedSplit } from "@/components/insights/fixed-split";
import { FlowChart, type FlowPoint } from "@/components/insights/flow-chart";
import {
  WEEKDAYS_SHORT,
  basisText,
  cumulativeTitle,
  fixedTitle,
  flowTitle,
  shortMonth,
  weekdayName,
  weekdayTitle,
} from "@/components/insights/insight-copy";
import { PotjeMultiples, type PotjeRow } from "@/components/insights/potje-multiples";
import { WeekdayChart } from "@/components/insights/weekday-chart";
import { capitalize, periodMonthName, periodSubtitle } from "@/components/overview/overview-copy";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ensureProfile, requireUser } from "@/lib/auth";
import { formatDay, formatEuro, formatEuroWhole, toISODate } from "@/lib/format";
import {
  OTHER_POTJES_ID,
  averageCumulative,
  averageFlow,
  cumulativeSpend,
  fixedVersusRest,
  incomeAndSpendPerPeriod,
  largestExpenses,
  periodLength,
  recentPeriods,
  recurringInput,
  spendPerWeekday,
  spendSeriesPerCategory,
} from "@/lib/insights/charts";
import { previousPeriods } from "@/lib/insights/compute";
import { loadInsightData } from "@/lib/insights/queries";
import { detectRecurring, recurringMonthlyTotal } from "@/lib/insights/recurring";
import { amsterdamToday } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Meer inzicht" };

/** Zoveel periodes (tot en met de lopende) laten de grafieken zien. */
const PERIODS = 6;
/** Grootste potjes met een eigen rij; de rest gaat samen. */
const TOP_POTJES = 6;

function dayAfter(date: Date, days: number): string {
  return toISODate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-[15px] text-text-muted">{text}</p>;
}

/** Grafieken over je laatste maanden. Alles uit één keer laden; de rekenwerk staat in lib/insights/charts.ts. */
export default async function InzichtPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const supabase = await createClient();
  const today = amsterdamToday();
  const salaryDay = profile.salary_day;

  const periods = recentPeriods(salaryDay, today, PERIODS);
  const insight = await loadInsightData(supabase, today, { since: periods[0].startISO });
  const catMap = new Map(insight.cats.map((c) => [c.id, c]));
  const current = periods[periods.length - 1];
  const monthName = periodMonthName(current);
  const subtitle = periodSubtitle(current, today, true, Boolean(salaryDay));

  // a. Inkomsten en uitgaven per maand.
  const flows = incomeAndSpendPerPeriod(insight.txs, catMap, periods, today);
  const shown = periods.slice(periods.length - flows.length);
  const months = shown.map((p) => periodMonthName(p));
  const average = averageFlow(flows);
  const hasData = flows.some((f) => f.income > 0 || f.spent > 0);
  const flowPoints: FlowPoint[] = flows.map((f, i) => ({
    short: shortMonth(months[i]),
    long: f.current ? `${capitalize(months[i])} (tot nu toe)` : capitalize(months[i]),
    income: f.income,
    spent: f.spent,
    net: f.net,
  }));

  // b. Uitgaven per potje over dezelfde maanden.
  const series = spendSeriesPerCategory(insight.txs, catMap, shown, TOP_POTJES);
  const potjeRows: PotjeRow[] = series.flatMap((s) => {
    const full = s.values.slice(0, -1);
    const avg = full.length > 0 ? full.reduce((a, b) => a + b, 0) / full.length : null;
    if (s.id === OTHER_POTJES_ID) {
      return [{ id: s.id, name: "Overige potjes", icon: "package", color: "grijs", values: s.values, average: avg, other: true }];
    }
    const cat = catMap.get(s.id);
    return cat ? [{ id: cat.id, name: cat.name, icon: cat.icon, color: cat.color, values: s.values, average: avg }] : [];
  });
  const biggest = potjeRows.find((r) => !r.other);

  // c. Deze maand tot nu, tegenover het gemiddelde op dezelfde dag.
  const length = periodLength(current);
  const elapsed = Math.min(length, Math.round((today.getTime() - current.start.getTime()) / 864e5) + 1);
  const days = Array.from({ length }, (_, i) => dayAfter(current.start, i));
  const curve = cumulativeSpend(insight.txs, catMap, current, elapsed);
  const avgCurve = averageCumulative(insight.txs, catMap, previousPeriods(salaryDay, today, 3), length);
  const spentNow = curve.at(-1) ?? 0;
  const avgNow = avgCurve ? avgCurve.values[elapsed - 1] : null;

  // d. Per weekdag: deze en de vorige drie periodes, tot en met vandaag.
  const weekFrom = previousPeriods(salaryDay, today, 3).at(-1)?.startISO ?? current.startISO;
  const weekdays = spendPerWeekday(insight.txs, catMap, weekFrom, dayAfter(today, 1));
  const weekdayDays = weekdays.days.reduce((a, b) => a + b, 0);
  const weekdayMax = weekdays.average.indexOf(Math.max(...weekdays.average));

  // e. Grootste uitgaven deze periode.
  const largest = largestExpenses(insight.txs, catMap, current.startISO, current.endISO, 5);

  // f. Vaste lasten tegenover de rest van een gemiddelde maand.
  const recurringIn = recurringInput(insight.txs, insight.cats);
  const recurring = detectRecurring(recurringIn.txs, recurringIn.systemIds, salaryDay, today);
  const recurringTotal = recurringMonthlyTotal(recurring);
  const split = average ? fixedVersusRest(recurringTotal, average.spent) : null;

  if (!hasData) {
    return (
      <>
        <PageHeader title="Meer inzicht" subtitle={subtitle} backHref="/overzicht" />
        <div className="px-4 pb-8">
          <Card padding="none">
            <EmptyState
              icon={<ChartColumn />}
              title="Nog niets te laten zien"
              description="Zet je kaartjes in potjes, dan verschijnen hier je grafieken."
            />
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Meer inzicht" subtitle={subtitle} backHref="/overzicht" />
      <div className="flex flex-col gap-4 px-4 pb-8">
        <ChartCard
          title={flowTitle(average, flows.at(-1)?.net ?? 0)}
          subtitle={`Inkomsten en uitgaven per maand. ${capitalize(monthName)} loopt nog.`}
          legend={
            <Legend
              items={[
                { label: "Inkomsten", color: "var(--chart-in)", mark: "rect" },
                { label: "Uitgaven", color: "var(--chart-out)", mark: "rect" },
              ]}
            />
          }
          footnote={average ? basisText(average.periods) : "Na je eerste volle maand zie je hier je gemiddelde."}
          table={
            <ChartTable
              head={["Maand", "In", "Uit", "Over"]}
              rows={flowPoints.map((p) => [p.long, formatEuroWhole(p.income), formatEuroWhole(p.spent), formatEuroWhole(p.net)])}
            />
          }
        >
          <FlowChart points={flowPoints} />
        </ChartCard>

        {potjeRows.length === 0 || !biggest ? (
          <Card>
            <h2 className="text-[17px] leading-[22px] font-semibold">Uitgaven per potje</h2>
            <Empty text="Nog geen uitgaven in potjes." />
          </Card>
        ) : (
          <ChartCard
            title={`${biggest.name} is je grootste potje`}
            subtitle={`Per maand, elk potje op een eigen schaal. Rechts: ${monthName} tot nu.`}
            footnote="Tik op een potje voor de bedragen."
            table={
              <ChartTable
                head={["Potje", ...months.map(shortMonth)]}
                rows={potjeRows.map((r) => [r.name, ...r.values.map((v) => formatEuroWhole(v))])}
              />
            }
          >
            <PotjeMultiples rows={potjeRows} months={months.map(shortMonth)} />
          </ChartCard>
        )}

        {spentNow <= 0 && !avgCurve ? (
          <Card>
            <h2 className="text-[17px] leading-[22px] font-semibold">Deze maand tot nu</h2>
            <Empty text="Deze maand nog niets uitgegeven." />
          </Card>
        ) : (
          <ChartCard
            title={cumulativeTitle(spentNow, avgNow, monthName)}
            subtitle="Opgeteld per dag, tegenover je gemiddelde op dezelfde dag."
            legend={
              <Legend
                items={[
                  { label: capitalize(monthName), color: "var(--chart-out)", mark: "line" },
                  ...(avgCurve ? [{ label: "Gemiddeld", color: "var(--chart-ref)", mark: "dashed" as const }] : []),
                ]}
              />
            }
            footnote={avgCurve ? basisText(avgCurve.periodsUsed) : "Vanaf volgende maand zie je hier je gemiddelde."}
            table={
              <ChartTable
                head={avgCurve ? ["Dag", capitalize(monthName), "Gemiddeld"] : ["Dag", capitalize(monthName)]}
                rows={days.slice(0, elapsed).map((d, i) => [
                  formatDay(d),
                  formatEuroWhole(curve[i]),
                  ...(avgCurve ? [formatEuroWhole(avgCurve.values[i])] : []),
                ])}
              />
            }
          >
            <CumulativeChart days={days} current={curve} average={avgCurve?.values ?? null} />
          </ChartCard>
        )}

        {weekdayDays < 7 || Math.max(...weekdays.average) <= 0 ? (
          <Card>
            <h2 className="text-[17px] leading-[22px] font-semibold">Uitgaven per weekdag</h2>
            <Empty text="Na een week zie je hier op welke dagen je het meest uitgeeft." />
          </Card>
        ) : (
          <ChartCard
            title={weekdayTitle(weekdayMax)}
            subtitle="Gemiddeld per dag, deze en de vorige drie maanden."
            table={
              <ChartTable
                head={["Dag", "Per dag", "Totaal"]}
                rows={WEEKDAYS_SHORT.map((_, i) => [
                  capitalize(weekdayName(i)),
                  formatEuroWhole(weekdays.average[i]),
                  formatEuroWhole(weekdays.totals[i]),
                ])}
              />
            }
          >
            <WeekdayChart average={weekdays.average} totals={weekdays.totals} />
          </ChartCard>
        )}

        <section aria-labelledby="grootste" className="rounded-card bg-surface shadow-card">
          <h2 id="grootste" className="px-4 pt-4 text-[17px] leading-[22px] font-semibold">
            Grootste uitgaven in {monthName}
          </h2>
          {largest.length === 0 ? (
            <div className="px-4">
              <Empty text="Deze maand nog geen uitgaven." />
            </div>
          ) : (
            <ol className="mt-2 divide-y">
              {largest.map(({ tx, amount }) => {
                const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined;
                return (
                  <li key={tx.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                    {cat ? (
                      <CategoryBadge icon={cat.icon} color={cat.color} size="sm" />
                    ) : (
                      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center">
                        <span className="size-2.5 rounded-full bg-text-muted/50" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{tx.counterparty || "Onbekende tegenpartij"}</span>
                      <span className="block truncate text-[13px] leading-[18px] text-text-muted">
                        {formatDay(tx.bookingDate)} · {cat ? cat.name : "Nog op de stapel"}
                      </span>
                    </span>
                    <span className="shrink-0 text-[15px] font-semibold whitespace-nowrap tabular-nums">{formatEuro(amount)}</span>
                  </li>
                );
              })}
            </ol>
          )}
          <Link
            href="/transacties"
            className="flex min-h-11 items-center px-4 pb-1 text-[13px] font-medium text-primary hover:underline"
          >
            Alle kaartjes
          </Link>
        </section>

        {recurring.length === 0 ? (
          <Card>
            <h2 className="text-[17px] leading-[22px] font-semibold">Vaste lasten en de rest</h2>
            <Empty text="Nog geen vaste lasten gevonden. Betalingen die elke maand terugkomen, zie je hier vanzelf." />
          </Card>
        ) : !split || !average ? (
          <Card>
            <h2 className="text-[17px] leading-[22px] font-semibold">Vaste lasten en de rest</h2>
            <Empty text="Na je eerste volle maand zie je hier hoeveel daarvan vastligt." />
          </Card>
        ) : (
          <ChartCard
            title={fixedTitle(split.share)}
            subtitle="Per maand, tegenover wat je gemiddeld uitgeeft."
            footnote={basisText(average.periods)}
            table={
              <ChartTable
                head={["", "Per maand", "Deel"]}
                rows={[
                  ["Vaste lasten", formatEuroWhole(split.fixed), `${Math.round(split.share * 100)}%`],
                  ["De rest", formatEuroWhole(split.rest), `${100 - Math.round(split.share * 100)}%`],
                ]}
              />
            }
          >
            <FixedSplit fixed={split.fixed} rest={split.rest} share={split.share} />
            <Link
              href="/overzicht/vaste-lasten"
              className="mt-1 -mb-1 flex min-h-11 items-center text-[13px] font-medium text-primary hover:underline"
            >
              Bekijk je vaste lasten
            </Link>
          </ChartCard>
        )}
      </div>
    </>
  );
}
