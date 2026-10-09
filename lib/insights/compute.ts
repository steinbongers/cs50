/**
 * Pure rekenfuncties voor het overzicht, potje-detail en Jouw maand.
 * Geen database, geen datums van 'nu' zonder parameter: alles testbaar.
 */
import { currentPeriod, type Period } from "@/lib/periods";
import { toISODate } from "@/lib/format";

export interface TxLite {
  id: string;
  bookingDate: string;
  amount: number;
  ownShare: number | null;
  categoryId: string | null;
  createdAt: string;
  categorizedAt: string | null;
  isInternal: boolean;
  /** Opgeschoonde tegenpartij; alleen gevuld door de loader (lijsten op Overzicht en Meer inzicht). */
  counterparty?: string | null;
  /** Deel van een verdeelde afschrijving (de afschrijving zelf staat in Verdeeld). */
  isSplitPart?: boolean;
}

export interface CatLite {
  id: string;
  name: string;
  icon: string;
  color: string;
  isIncome: boolean;
  systemKey: string | null;
  monthlyBudget: number | null;
  goalAmount: number | null;
}

/**
 * Wat een transactie bijdraagt aan "uitgegeven": het eigen deel van een uitgave,
 * of een negatieve bijdrage voor een terugbetaling in een uitgavepotje of in Geld terug.
 * Inkomen, Voorgeschoten, Contant en eigen overboekingen tellen niet.
 */
export function spendOf(tx: TxLite, cats: Map<string, CatLite>): number {
  if (tx.isInternal) return 0;
  const cat = tx.categoryId ? cats.get(tx.categoryId) : null;
  // Geld terug zonder potje: gaat van het totaal af, bij geen enkel potje.
  if (cat?.systemKey === "terug") return -tx.amount;
  if (cat && (cat.isIncome || cat.systemKey)) return 0;
  if (tx.amount < 0) return tx.ownShare ?? -tx.amount;
  // Inkomend geld zonder potje weten we nog niet; met uitgavepotje is het een terugbetaling.
  return cat ? -tx.amount : 0;
}

/**
 * Wat een transactie bijdraagt aan "inkomsten": alleen geld in een inkomstenpotje.
 * Geld terug, Voorgeschoten, terugbetalingen in een uitgavepotje, eigen overboekingen
 * en inkomend geld zonder potje tellen nooit als inkomen. Een afschrijving in een
 * inkomstenpotje (een correctie) gaat er weer vanaf.
 */
export function incomeOf(tx: TxLite, cats: Map<string, CatLite>): number {
  if (tx.isInternal || !tx.categoryId) return 0;
  const cat = cats.get(tx.categoryId);
  if (!cat || !cat.isIncome || cat.systemKey) return 0;
  return tx.amount;
}

/** Inkomsten in [from, to). Nooit negatief. */
export function totalIncome(txs: TxLite[], cats: Map<string, CatLite>, from: string, to: string): number {
  let total = 0;
  for (const tx of txs) if (inRange(tx.bookingDate, from, to)) total += incomeOf(tx, cats);
  return Math.max(0, round2(total));
}

/** Inkomsten per inkomstenpotje in [from, to). */
export function incomePerCategory(
  txs: TxLite[],
  cats: Map<string, CatLite>,
  from: string,
  to: string,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const tx of txs) {
    if (!tx.categoryId || !inRange(tx.bookingDate, from, to)) continue;
    const value = incomeOf(tx, cats);
    if (value === 0) continue;
    totals.set(tx.categoryId, round2((totals.get(tx.categoryId) ?? 0) + value));
  }
  return totals;
}

function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date < to;
}

/**
 * Heeft deze periode uitgaven die meetellen? Een periode met alleen salaris of
 * eigen overboekingen telt niet als "0 uitgegeven" in een gemiddelde.
 */
/** Telt een periode mee voor gemiddelden? Alleen als er netto echt iets is uitgegeven (niet alleen terugbetalingen). */
function hasSpending(txs: TxLite[], cats: Map<string, CatLite>, from: string, to: string): boolean {
  return totalSpent(txs, cats, from, to) > 0;
}

/**
 * Netto uitgegeven in [from, to). Nooit negatief: krijg je meer terug dan je uitgaf
 * (bijvoorbeeld alleen refunds in een maand), dan is er niets uitgegeven.
 */
export function totalSpent(txs: TxLite[], cats: Map<string, CatLite>, from: string, to: string): number {
  let total = 0;
  for (const tx of txs) if (inRange(tx.bookingDate, from, to)) total += spendOf(tx, cats);
  return Math.max(0, round2(total));
}

export function spentPerCategory(
  txs: TxLite[],
  cats: Map<string, CatLite>,
  from: string,
  to: string,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const tx of txs) {
    if (!tx.categoryId || !inRange(tx.bookingDate, from, to)) continue;
    const value = spendOf(tx, cats);
    if (value === 0) continue;
    totals.set(tx.categoryId, round2((totals.get(tx.categoryId) ?? 0) + value));
  }
  return totals;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return toISODate(date);
}

function daysBetween(fromISO: string, toISO: string): number {
  const [y1, m1, d1] = fromISO.split("-").map(Number);
  const [y2, m2, d2] = toISO.split("-").map(Number);
  return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 864e5);
}

/** De laatste `count` volledige periodes vóór de huidige. */
export function previousPeriods(salaryDay: number | null, today: Date, count: number): Period[] {
  const periods: Period[] = [];
  let cursor = currentPeriod(salaryDay, today);
  for (let i = 0; i < count; i++) {
    const dayBefore = new Date(cursor.start);
    dayBefore.setDate(dayBefore.getDate() - 1);
    cursor = currentPeriod(salaryDay, dayBefore);
    periods.push(cursor);
  }
  return periods;
}

export interface Comparison {
  current: number;
  /** Gemiddelde van vorige periodes op hetzelfde punt (even veel dagen onderweg). */
  average: number | null;
  periodsUsed: number;
  daysElapsed: number;
}

/**
 * Uitgegeven in de huidige periode, vergeleken met het gemiddelde van de
 * (maximaal drie) vorige periodes na even veel dagen. Periodes zonder
 * meetellende uitgaven tellen niet mee.
 */
export function compareWithAverage(
  txs: TxLite[],
  cats: Map<string, CatLite>,
  salaryDay: number | null,
  today: Date,
): Comparison {
  const period = currentPeriod(salaryDay, today);
  const todayISO = toISODate(today);
  const daysElapsed = daysBetween(period.startISO, todayISO) + 1;
  const current = totalSpent(txs, cats, period.startISO, addDays(period.startISO, daysElapsed));

  const samples: number[] = [];
  for (const prev of previousPeriods(salaryDay, today, 3)) {
    if (!hasSpending(txs, cats, prev.startISO, prev.endISO)) continue;
    const until = addDays(prev.startISO, daysElapsed);
    samples.push(totalSpent(txs, cats, prev.startISO, until < prev.endISO ? until : prev.endISO));
  }

  return {
    current,
    average: samples.length ? round2(samples.reduce((a, b) => a + b, 0) / samples.length) : null,
    periodsUsed: samples.length,
    daysElapsed,
  };
}

export interface CategoryDeviation {
  categoryId: string;
  /** Uitgegeven in dit potje deze periode, tot en met vandaag. */
  current: number;
  /** Gemiddelde van de vorige periodes na even veel dagen (0 als er geen vorige periodes zijn). */
  average: number;
  /** current - average: positief is meer dan gewoonlijk. */
  diff: number;
  periodsUsed: number;
}

export interface DeviationOptions {
  /** Hoeveel vorige periodes maximaal meetellen (standaard 3). */
  maxPeriods?: number;
}

/**
 * Per potje (zonder Inkomen en systeempotjes): uitgegeven deze periode tot en met
 * vandaag, tegenover het gemiddelde van de vorige periodes op hetzelfde punt.
 * Zelfde mechanisme als `compareWithAverage`: periodes zonder meetellende
 * uitgaven tellen niet mee. Gesorteerd op grootste afwijking (|diff|) eerst.
 * Potjes die nu en eerder op 0 staan, vallen weg.
 */
export function categoryDeviations(
  txs: TxLite[],
  cats: CatLite[] | Map<string, CatLite>,
  salaryDay: number | null,
  today: Date,
  opts: DeviationOptions = {},
): CategoryDeviation[] {
  const catList = cats instanceof Map ? [...cats.values()] : cats;
  const catMap = cats instanceof Map ? cats : new Map(cats.map((c) => [c.id, c]));
  const maxPeriods = Math.max(0, Math.floor(opts.maxPeriods ?? 3));

  const period = currentPeriod(salaryDay, today);
  const daysElapsed = daysBetween(period.startISO, toISODate(today)) + 1;
  const currentPer = spentPerCategory(txs, catMap, period.startISO, addDays(period.startISO, daysElapsed));

  const samples: Map<string, number>[] = [];
  for (const prev of previousPeriods(salaryDay, today, maxPeriods)) {
    if (!hasSpending(txs, catMap, prev.startISO, prev.endISO)) continue;
    const until = addDays(prev.startISO, daysElapsed);
    samples.push(spentPerCategory(txs, catMap, prev.startISO, until < prev.endISO ? until : prev.endISO));
  }

  const rows: CategoryDeviation[] = [];
  for (const cat of catList) {
    if (cat.isIncome || cat.systemKey) continue;
    const current = Math.max(0, currentPer.get(cat.id) ?? 0);
    const average = samples.length
      ? round2(samples.reduce((sum, m) => sum + Math.max(0, m.get(cat.id) ?? 0), 0) / samples.length)
      : 0;
    if (current === 0 && average === 0) continue;
    rows.push({ categoryId: cat.id, current, average, diff: round2(current - average), periodsUsed: samples.length });
  }
  return rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

/** Vanaf welk verschil (in euro's) een potje opvalt. */
export const STANDOUT_MIN_DIFF = 25;
/** Vanaf welk deel van het gemiddelde een potje opvalt. */
export const STANDOUT_MIN_RATIO = 0.25;
/** Pas na zoveel dagen in de periode is een vergelijking zinnig. */
export const STANDOUT_MIN_DAYS = 7;

/**
 * Het ene potje dat het noemen waard is, of null. Eerste item (lijst is al op
 * grootste afwijking gesorteerd) met |diff| ≥ € 25 én ≥ 25% van het gemiddelde,
 * minstens één vorige periode met een gemiddelde boven 0, en minstens 7 dagen onderweg.
 */
export function pickStandout(deviations: CategoryDeviation[], daysElapsed: number): CategoryDeviation | null {
  if (daysElapsed < STANDOUT_MIN_DAYS) return null;
  for (const d of deviations) {
    const size = Math.abs(d.diff);
    if (d.periodsUsed < 1) continue;
    // Zonder eigen gemiddelde (nieuw potje, of eerder leeg) is er niets om mee te vergelijken.
    if (d.average <= 0) continue;
    if (size < STANDOUT_MIN_DIFF) continue;
    if (size < STANDOUT_MIN_RATIO * d.average) continue;
    return d;
  }
  return null;
}

export interface Streak {
  days: number;
  /** Is de stapel op dit moment leeg? */
  todayDone: boolean;
  /** Is er in de afgelopen 7 dagen een gemiste dag opgevangen? */
  forgivenRecently: boolean;
}

/** Eén gemiste dag per zoveel dagen wordt opgevangen zonder dat de reeks breekt. */
export const STREAK_GRACE_WINDOW = 7;

/**
 * Dagstreak, vergevingsgezind:
 * - Een dag telt als er aan het eind van die dag niets open stond.
 * - Dagen zonder nieuwe kaartjes tellen gewoon door.
 * - Eén gemiste dag per 7 dagen wordt opgevangen: hij telt niet mee, maar breekt de reeks
 *   ook niet. Pas een tweede gemiste dag binnen 7 dagen breekt hem. (Een gebroken reeks
 *   demotiveert sterk; een herstelkans dempt dat, zie docs/productplan.md.)
 * - Vandaag telt nog niet mee en breekt ook niets.
 * We tellen terug vanaf gisteren tot de dag waarop de eerste transactie binnenkwam.
 */
export function dailyStreak(txs: TxLite[], today: Date, maxDays = 365): Streak {
  const relevant = txs.filter((t) => !t.isInternal);
  if (relevant.length === 0) return { days: 0, todayDone: true, forgivenRecently: false };

  const firstCreated = relevant.reduce((min, t) => (t.createdAt < min ? t.createdAt : min), relevant[0].createdAt);
  const firstDay = toISODate(new Date(firstCreated));
  const todayDone = !relevant.some((t) => t.categorizedAt === null);

  let days = 0;
  /** Index (dagen terug) van de laatst opgevangen gemiste dag. */
  let forgivenAt: number | null = null;
  for (let i = 1; i <= maxDays; i++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const dayISO = toISODate(day);
    if (dayISO < firstDay) break;
    const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime();
    const openThatDay = relevant.some((t) => {
      const created = new Date(t.createdAt).getTime();
      if (created > endOfDay) return false;
      if (t.categorizedAt === null) return true;
      return new Date(t.categorizedAt).getTime() > endOfDay;
    });
    if (openThatDay) {
      if (forgivenAt === null || i - forgivenAt >= STREAK_GRACE_WINDOW) {
        forgivenAt = i;
        continue;
      }
      break;
    }
    days++;
  }
  return { days, todayDone, forgivenRecently: days > 0 && forgivenAt !== null && forgivenAt <= STREAK_GRACE_WINDOW };
}

export interface WeekPoint {
  weekStart: string;
  spent: number;
}

/** Uitgaven per week (maandag t/m zondag) voor één potje, oudste eerst. */
export function weeklySeries(
  txs: TxLite[],
  cats: Map<string, CatLite>,
  categoryId: string,
  today: Date,
  weeks = 8,
): WeekPoint[] {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekday = (monday.getDay() + 6) % 7; // maandag = 0
  monday.setDate(monday.getDate() - weekday);

  const points: WeekPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(monday);
    start.setDate(monday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const from = toISODate(start);
    const to = toISODate(end);
    let spent = 0;
    for (const tx of txs) {
      if (tx.categoryId === categoryId && inRange(tx.bookingDate, from, to)) spent += spendOf(tx, cats);
    }
    points.push({ weekStart: from, spent: round2(spent) });
  }
  return points;
}

export interface MonthReviewCategory {
  category: CatLite;
  spent: number;
  average: number | null;
  budget: number | null;
}

export interface MonthReview {
  period: Period;
  total: number;
  average: number | null;
  periodsUsed: number;
  categories: MonthReviewCategory[];
}

/** Jouw maand: de afgelopen periode, totaal en per potje tegenover het gemiddelde ervoor. */
export function monthReview(
  txs: TxLite[],
  catList: CatLite[],
  salaryDay: number | null,
  today: Date,
): MonthReview | null {
  const cats = new Map(catList.map((c) => [c.id, c]));
  const [last, ...earlier] = previousPeriods(salaryDay, today, 4);
  if (!last) return null;
  if (!hasSpending(txs, cats, last.startISO, last.endISO)) return null;

  const usable = earlier.filter((p) => hasSpending(txs, cats, p.startISO, p.endISO));
  const avg = (values: number[]) => (values.length ? round2(values.reduce((a, b) => a + b, 0) / values.length) : null);

  const total = totalSpent(txs, cats, last.startISO, last.endISO);
  const average = avg(usable.map((p) => totalSpent(txs, cats, p.startISO, p.endISO)));

  const lastPer = spentPerCategory(txs, cats, last.startISO, last.endISO);
  const earlierPer = usable.map((p) => spentPerCategory(txs, cats, p.startISO, p.endISO));

  const categories = catList
    .filter((c) => !c.isIncome && !c.systemKey)
    .map((category) => ({
      category,
      spent: lastPer.get(category.id) ?? 0,
      average: avg(earlierPer.map((m) => m.get(category.id) ?? 0)),
      budget: category.monthlyBudget,
    }))
    .filter((row) => row.spent !== 0 || (row.average ?? 0) !== 0 || row.budget !== null)
    .sort((a, b) => b.spent - a.spent);

  return { period: last, total, average, periodsUsed: usable.length, categories };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
