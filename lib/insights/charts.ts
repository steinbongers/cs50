/**
 * Pure rekenfuncties voor Meer inzicht en de Inkomsten-weergave op Overzicht.
 * Zelfde regels als compute.ts: wat uitgegeven is volgt `spendOf`, wat binnenkwam
 * `incomeOf`. Geen database, geen 'nu' zonder parameter: alles testbaar.
 */
import { VERDEELD_CATEGORY } from "@/lib/categories/types";
import { toISODate } from "@/lib/format";
import { currentPeriod, type Period } from "@/lib/periods";
import {
  incomeOf,
  previousPeriods,
  round2,
  spendOf,
  spentPerCategory,
  totalIncome,
  totalSpent,
  type CatLite,
  type TxLite,
} from "./compute";
import type { RecurringTx } from "./recurring";

/** Id van de verzamelrij voor de kleinere potjes. */
export const OTHER_POTJES_ID = "__overige";

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

function daysBetween(fromISO: string, toISO: string): number {
  const [y1, m1, d1] = fromISO.split("-").map(Number);
  const [y2, m2, d2] = toISO.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
}

/** Aantal dagen in een periode. */
export function periodLength(period: Period): number {
  return Math.max(1, daysBetween(period.startISO, period.endISO));
}

/** De laatste `count` periodes tot en met de huidige, oudste eerst. */
export function recentPeriods(salaryDay: number | null, today: Date, count: number): Period[] {
  const before = previousPeriods(salaryDay, today, Math.max(0, count - 1)).reverse();
  return [...before, currentPeriod(salaryDay, today)];
}

export interface PeriodFlow {
  startISO: string;
  endISO: string;
  income: number;
  spent: number;
  /** Inkomsten min uitgaven: positief is over. */
  net: number;
  /** De lopende periode (loopt nog). */
  current: boolean;
}

/**
 * Inkomsten en uitgaven per periode, oudste eerst. Periodes vóór de eerste met
 * gegevens vallen weg (vóór het koppelen van de bank is er niets te tonen); de
 * lopende periode blijft altijd staan.
 */
export function incomeAndSpendPerPeriod(
  txs: TxLite[],
  cats: Map<string, CatLite>,
  periods: Period[],
  today: Date,
): PeriodFlow[] {
  const todayISO = toISODate(today);
  const flows = periods.map((p) => {
    const income = totalIncome(txs, cats, p.startISO, p.endISO);
    const spent = totalSpent(txs, cats, p.startISO, p.endISO);
    return {
      startISO: p.startISO,
      endISO: p.endISO,
      income,
      spent,
      net: round2(income - spent),
      current: todayISO >= p.startISO && todayISO < p.endISO,
    };
  });
  const first = flows.findIndex((f) => f.current || f.income > 0 || f.spent > 0);
  return first < 0 ? [] : flows.slice(first);
}

export interface FlowAverage {
  income: number;
  spent: number;
  net: number;
  /** Zoveel volle periodes tellen mee. */
  periods: number;
}

/** Gemiddelde over de volle (afgelopen) periodes met gegevens, of null als die er niet zijn. */
export function averageFlow(flows: PeriodFlow[]): FlowAverage | null {
  const full = flows.filter((f) => !f.current && (f.income > 0 || f.spent > 0));
  if (full.length === 0) return null;
  const avg = (pick: (f: PeriodFlow) => number) => round2(full.reduce((sum, f) => sum + pick(f), 0) / full.length);
  return { income: avg((f) => f.income), spent: avg((f) => f.spent), net: avg((f) => f.net), periods: full.length };
}

export interface IncomeComparison {
  current: number;
  /** Gemiddelde van de vorige periodes met inkomsten, of null. */
  average: number | null;
  periodsUsed: number;
}

/**
 * Inkomsten in de getoonde periode tegenover het gemiddelde van de vorige periodes
 * (nieuwste eerst, maximaal drie). Periodes zonder inkomsten tellen niet mee.
 * Met `days` vergelijken we na even veel dagen (voor de lopende periode).
 */
export function compareIncome(
  txs: TxLite[],
  cats: Map<string, CatLite>,
  shown: Period,
  previous: Period[],
  days?: number,
): IncomeComparison {
  const until = (p: Period) => {
    if (days === undefined) return p.endISO;
    const end = addDays(p.startISO, days);
    return end < p.endISO ? end : p.endISO;
  };
  const current = totalIncome(txs, cats, shown.startISO, until(shown));
  const samples: number[] = [];
  for (const prev of previous.slice(0, 3)) {
    if (totalIncome(txs, cats, prev.startISO, prev.endISO) <= 0) continue;
    samples.push(totalIncome(txs, cats, prev.startISO, until(prev)));
  }
  return {
    current,
    average: samples.length ? round2(samples.reduce((a, b) => a + b, 0) / samples.length) : null,
    periodsUsed: samples.length,
  };
}

/** Inkomend geld zonder potje in [from, to): nog niet ingedeeld, dus nog geen inkomen. */
export function unsortedIncoming(txs: TxLite[], from: string, to: string): number {
  let total = 0;
  for (const tx of txs) {
    if (tx.isInternal || tx.categoryId !== null || tx.amount <= 0) continue;
    if (tx.bookingDate >= from && tx.bookingDate < to) total += tx.amount;
  }
  return round2(total);
}

export interface PotjeSeries {
  /** Potje-id, of `OTHER_POTJES_ID` voor de rest samen. */
  id: string;
  /** Uitgegeven per periode, zelfde volgorde als de periodes (nooit negatief). */
  values: number[];
  total: number;
}

/**
 * Uitgaven per uitgavepotje over de periodes. De `max` grootste potjes (over alle
 * periodes samen) krijgen een eigen rij; de rest gaat samen in "Overige potjes".
 * Potjes zonder uitgaven vallen weg.
 */
export function spendSeriesPerCategory(
  txs: TxLite[],
  cats: Map<string, CatLite>,
  periods: Period[],
  max = 6,
): PotjeSeries[] {
  const perPeriod = periods.map((p) => spentPerCategory(txs, cats, p.startISO, p.endISO));
  const series: PotjeSeries[] = [];
  for (const cat of cats.values()) {
    if (cat.isIncome || cat.systemKey) continue;
    const values = perPeriod.map((m) => Math.max(0, m.get(cat.id) ?? 0));
    const total = round2(values.reduce((a, b) => a + b, 0));
    if (total > 0) series.push({ id: cat.id, values, total });
  }
  series.sort((a, b) => b.total - a.total);
  if (series.length <= max) return series;

  const head = series.slice(0, max);
  const tail = series.slice(max);
  const values = periods.map((_, i) => round2(tail.reduce((sum, s) => sum + s.values[i], 0)));
  return [...head, { id: OTHER_POTJES_ID, values, total: round2(values.reduce((a, b) => a + b, 0)) }];
}

/**
 * Opgeteld uitgegeven per dag van de periode: index 0 is de eerste dag (inclusief).
 * `days` beperkt de reeks (bijvoorbeeld tot en met vandaag). Nooit onder nul.
 */
export function cumulativeSpend(txs: TxLite[], cats: Map<string, CatLite>, period: Period, days?: number): number[] {
  const length = Math.min(periodLength(period), Math.max(0, days ?? Infinity));
  const perDay = new Array<number>(length).fill(0);
  for (const tx of txs) {
    if (tx.bookingDate < period.startISO || tx.bookingDate >= period.endISO) continue;
    const index = daysBetween(period.startISO, tx.bookingDate);
    if (index < length) perDay[index] += spendOf(tx, cats);
  }
  const series: number[] = [];
  let running = 0;
  for (const value of perDay) {
    running += value;
    series.push(Math.max(0, round2(running)));
  }
  return series;
}

export interface AverageCurve {
  values: number[];
  periodsUsed: number;
}

/**
 * Gemiddelde opgetelde lijn van vorige periodes, `length` dagen lang. Een kortere
 * periode blijft na haar laatste dag op haar eindtotaal staan. Periodes zonder
 * meetellende uitgaven tellen niet mee; zonder bruikbare periodes: null.
 */
export function averageCumulative(
  txs: TxLite[],
  cats: Map<string, CatLite>,
  periods: Period[],
  length: number,
): AverageCurve | null {
  const curves: number[][] = [];
  for (const p of periods) {
    if (totalSpent(txs, cats, p.startISO, p.endISO) <= 0) continue;
    const curve = cumulativeSpend(txs, cats, p);
    const last = curve.at(-1) ?? 0;
    curves.push(Array.from({ length }, (_, i) => curve[i] ?? last));
  }
  if (curves.length === 0) return null;
  const values = Array.from({ length }, (_, i) => round2(curves.reduce((sum, c) => sum + c[i], 0) / curves.length));
  return { values, periodsUsed: curves.length };
}

export interface WeekdaySpend {
  /** Maandag eerst. */
  totals: number[];
  /** Zoveel van die weekdagen vallen in de reeks. */
  days: number[];
  /** Gemiddeld per dag: totaal gedeeld door het aantal van die weekdagen. */
  average: number[];
}

/**
 * Uitgaven per weekdag (maandag eerst) in [from, to). De reeks begint pas bij de
 * eerste transactie, zodat dagen vóór het koppelen het gemiddelde niet drukken.
 */
export function spendPerWeekday(txs: TxLite[], cats: Map<string, CatLite>, from: string, to: string): WeekdaySpend {
  let start = from;
  let earliest: string | null = null;
  for (const tx of txs) if (!tx.isInternal && (earliest === null || tx.bookingDate < earliest)) earliest = tx.bookingDate;
  if (earliest !== null && earliest > start) start = earliest;

  const totals = new Array<number>(7).fill(0);
  const days = new Array<number>(7).fill(0);
  const count = Math.max(0, daysBetween(start, to));
  const [y, m, d] = start.split("-").map(Number);
  for (let i = 0; i < count; i++) days[(new Date(y, m - 1, d + i).getDay() + 6) % 7]++;

  for (const tx of txs) {
    if (tx.bookingDate < start || tx.bookingDate >= to) continue;
    const [ty, tm, td] = tx.bookingDate.split("-").map(Number);
    totals[(new Date(ty, tm - 1, td).getDay() + 6) % 7] += spendOf(tx, cats);
  }
  const rounded = totals.map((t) => Math.max(0, round2(t)));
  return { totals: rounded, days, average: rounded.map((t, i) => (days[i] > 0 ? round2(t / days[i]) : 0)) };
}

export interface LargeExpense {
  tx: TxLite;
  /** Wat de uitgave meetelt (eigen deel), positief. */
  amount: number;
}

/** De grootste uitgaven in [from, to), grootste eerst (bij gelijk bedrag de nieuwste). */
export function largestExpenses(
  txs: TxLite[],
  cats: Map<string, CatLite>,
  from: string,
  to: string,
  limit = 5,
): LargeExpense[] {
  return txs
    .filter((tx) => tx.bookingDate >= from && tx.bookingDate < to && tx.amount < 0)
    .map((tx) => ({ tx, amount: round2(spendOf(tx, cats)) }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount || b.tx.bookingDate.localeCompare(a.tx.bookingDate))
    .slice(0, limit);
}

/** Inkomende kaartjes per inkomstenpotje in [from, to), nieuwste eerst. */
export function incomeTransactionsPerCategory(
  txs: TxLite[],
  cats: Map<string, CatLite>,
  from: string,
  to: string,
): Map<string, TxLite[]> {
  const groups = new Map<string, TxLite[]>();
  for (const tx of txs) {
    if (tx.bookingDate < from || tx.bookingDate >= to || incomeOf(tx, cats) === 0 || !tx.categoryId) continue;
    const list = groups.get(tx.categoryId) ?? [];
    list.push(tx);
    groups.set(tx.categoryId, list);
  }
  for (const list of groups.values()) list.sort((a, b) => b.bookingDate.localeCompare(a.bookingDate) || b.amount - a.amount);
  return groups;
}

export interface FixedSplit {
  fixed: number;
  rest: number;
  /** Deel vaste lasten van het totaal, 0 tot 1. */
  share: number;
}

/** Vaste lasten tegenover de rest van een gemiddelde maand. Null zonder uitgaven of vaste lasten. */
export function fixedVersusRest(recurringTotal: number, averageSpent: number): FixedSplit | null {
  if (recurringTotal <= 0 || averageSpent <= 0) return null;
  const fixed = round2(Math.min(recurringTotal, averageSpent));
  return { fixed, rest: round2(averageSpent - fixed), share: fixed / averageSpent };
}

/**
 * Ronde as-waarden van 0 tot en met een mooi maximum (1, 2, 2,5 of 5 maal een macht
 * van tien), met `steps` stappen. Het maximum is altijd minstens `max`.
 */
export function niceTicks(max: number, steps = 2): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / steps;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * power).find((s) => s >= raw) ?? 10 * power;
  const ticks: number[] = [];
  for (let v = 0; v < max + step - 1e-9; v += step) ticks.push(round2(v));
  return ticks;
}

/**
 * Invoer voor `detectRecurring` uit de geladen transacties. Een verdeelde afschrijving
 * telt mee (het is een echte betaling van je rekening), de delen niet; de andere
 * ingebouwde potjes (Voorgeschoten, Contant, Geld terug) blijven buiten de vaste lasten.
 */
export function recurringInput(txs: TxLite[], cats: CatLite[]): { txs: RecurringTx[]; systemIds: Set<string> } {
  const systemIds = new Set(cats.filter((c) => c.systemKey && c.systemKey !== VERDEELD_CATEGORY.systemKey).map((c) => c.id));
  const rows = txs
    .filter((tx) => !tx.isSplitPart)
    .map((tx) => ({
      bookingDate: tx.bookingDate,
      amount: tx.amount,
      counterparty: tx.counterparty ?? null,
      categoryId: tx.categoryId,
      isInternal: tx.isInternal,
    }));
  return { txs: rows, systemIds };
}
