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
}

export interface CatLite {
  id: string;
  name: string;
  icon: string;
  color: string;
  isIncome: boolean;
  systemKey: string | null;
  monthlyBudget: number | null;
}

/**
 * Wat een transactie bijdraagt aan "uitgegeven": het eigen deel van een uitgave,
 * of een negatieve bijdrage voor een terugbetaling in een uitgavepotje.
 * Inkomen, Voorgeschoten en eigen overboekingen tellen niet.
 */
export function spendOf(tx: TxLite, cats: Map<string, CatLite>): number {
  if (tx.isInternal) return 0;
  const cat = tx.categoryId ? cats.get(tx.categoryId) : null;
  if (cat && (cat.isIncome || cat.systemKey)) return 0;
  if (tx.amount < 0) return tx.ownShare ?? -tx.amount;
  // Inkomend geld zonder potje weten we nog niet; met uitgavepotje is het een terugbetaling.
  return cat ? -tx.amount : 0;
}

function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date < to;
}

export function totalSpent(txs: TxLite[], cats: Map<string, CatLite>, from: string, to: string): number {
  let total = 0;
  for (const tx of txs) if (inRange(tx.bookingDate, from, to)) total += spendOf(tx, cats);
  return round2(total);
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
 * (maximaal drie) vorige periodes na even veel dagen. Periodes zonder enige
 * transactie tellen niet mee.
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
    const hasAny = txs.some((t) => inRange(t.bookingDate, prev.startISO, prev.endISO));
    if (!hasAny) continue;
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

export interface Streak {
  days: number;
  /** Is de stapel op dit moment leeg? */
  todayDone: boolean;
}

/**
 * Dagstreak: een dag telt als er aan het eind van die dag niets open stond.
 * Dagen zonder nieuwe kaartjes tellen gewoon door. We tellen terug vanaf gisteren
 * tot de dag waarop de eerste transactie binnenkwam.
 */
export function dailyStreak(txs: TxLite[], today: Date, maxDays = 365): Streak {
  const relevant = txs.filter((t) => !t.isInternal);
  if (relevant.length === 0) return { days: 0, todayDone: true };

  const firstCreated = relevant.reduce((min, t) => (t.createdAt < min ? t.createdAt : min), relevant[0].createdAt);
  const firstDay = toISODate(new Date(firstCreated));
  const todayDone = !relevant.some((t) => t.categorizedAt === null);

  let days = 0;
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
    if (openThatDay) break;
    days++;
  }
  return { days, todayDone };
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
  const hasAny = txs.some((t) => inRange(t.bookingDate, last.startISO, last.endISO));
  if (!hasAny) return null;

  const usable = earlier.filter((p) => txs.some((t) => inRange(t.bookingDate, p.startISO, p.endISO)));
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
