/**
 * Vaste lasten herkennen: betalingen aan dezelfde ontvanger die elke maand
 * ongeveer even groot terugkomen (huur, telefoon, Spotify). Puur inzicht: de app
 * zegt niets op en deelt niets in. Geen database; alles testbaar.
 */
import { toISODate } from "@/lib/format";
import { currentPeriod } from "@/lib/periods";
import { counterpartyKey } from "@/lib/transactions/same-counterparty";
import { previousPeriods, round2 } from "./compute";

export interface RecurringTx {
  bookingDate: string;
  amount: number;
  counterparty: string | null;
  categoryId: string | null;
  isInternal: boolean;
}

export interface RecurringCharge {
  /** Genormaliseerde tegenpartij (`counterpartyKey`). */
  key: string;
  /** Tegenpartij zoals op het laatste kaartje. */
  name: string;
  /** Gemiddeld bedrag per keer, positief. */
  averageAmount: number;
  /** Dag van de maand waarop het meestal afgaat (1 tot 31). */
  usualDay: number;
  /** Laatste keer afgeschreven, "YYYY-MM-DD". */
  lastDate: string;
  /** Al afgeschreven in de huidige periode? */
  paidThisPeriod: boolean;
}

/** Zoveel van de laatste drie volle maanden moet de betaling voorkomen. */
export const RECURRING_MIN_MONTHS = 2;
/** Zoveel mag het bedrag afwijken om als "hetzelfde" te tellen. */
export const RECURRING_TOLERANCE = 0.2;
/**
 * Vaker per maand naar dezelfde ontvanger is gewoon winkelen (de supermarkt),
 * geen vaste last.
 */
export const RECURRING_MAX_PER_MONTH = 2;

function similar(amount: number, reference: number): boolean {
  return reference > 0 && Math.abs(amount - reference) <= RECURRING_TOLERANCE * reference;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface Group {
  name: string;
  nameDate: string;
  /** Per vorige periode (nieuwste eerst) de bedragen en datums. */
  months: { amount: number; date: string }[][];
  current: { amount: number; date: string }[];
}

/**
 * Uitgaande betalingen waarvan de tegenpartij in minstens 2 van de laatste 3 volle
 * maanden (salarisperiodes) voorkomt met een vergelijkbaar bedrag (±20%).
 * Eigen overboekingen en systeempotjes (Voorgeschoten, Contant) tellen niet mee.
 * Grootste bedrag eerst.
 */
export function detectRecurring(
  txs: readonly RecurringTx[],
  systemCategoryIds: ReadonlySet<string>,
  salaryDay: number | null,
  today: Date,
): RecurringCharge[] {
  const months = previousPeriods(salaryDay, today, 3);
  const current = currentPeriod(salaryDay, today);
  const groups = new Map<string, Group>();

  for (const tx of txs) {
    if (tx.amount >= 0 || tx.isInternal) continue;
    if (tx.categoryId && systemCategoryIds.has(tx.categoryId)) continue;
    const name = tx.counterparty?.trim() ?? "";
    const key = counterpartyKey(name);
    if (!key) continue;

    const entry = { amount: -tx.amount, date: tx.bookingDate };
    const monthIndex = months.findIndex((p) => tx.bookingDate >= p.startISO && tx.bookingDate < p.endISO);
    const inCurrent = tx.bookingDate >= current.startISO && tx.bookingDate < current.endISO;
    if (monthIndex < 0 && !inCurrent) continue;

    let group = groups.get(key);
    if (!group) {
      group = { name, nameDate: tx.bookingDate, months: months.map(() => []), current: [] };
      groups.set(key, group);
    }
    if (tx.bookingDate > group.nameDate) {
      group.name = name;
      group.nameDate = tx.bookingDate;
    }
    if (inCurrent) group.current.push(entry);
    else group.months[monthIndex].push(entry);
  }

  const charges: RecurringCharge[] = [];
  for (const [key, group] of groups) {
    if (group.months.some((m) => m.length > RECURRING_MAX_PER_MONTH)) continue;
    const all = group.months.flat();
    if (all.length < RECURRING_MIN_MONTHS) continue;

    // Per maand de betaling die het dichtst bij de mediaan ligt, als die vergelijkbaar is.
    const reference = median(all.map((e) => e.amount));
    const matched = group.months.flatMap((m) => {
      const close = m.filter((e) => similar(e.amount, reference));
      if (close.length === 0) return [];
      return [close.reduce((best, e) => (Math.abs(e.amount - reference) < Math.abs(best.amount - reference) ? e : best))];
    });
    if (matched.length < RECURRING_MIN_MONTHS) continue;

    const averageAmount = round2(matched.reduce((sum, e) => sum + e.amount, 0) / matched.length);
    const usualDay = Math.round(median(matched.map((e) => Number(e.date.slice(8, 10)))));
    const paidNow = group.current.filter((e) => similar(e.amount, averageAmount));
    const lastDate = [...matched, ...paidNow].map((e) => e.date).sort().at(-1) ?? matched[0].date;

    charges.push({ key, name: group.name, averageAmount, usualDay, lastDate, paidThisPeriod: paidNow.length > 0 });
  }
  return charges.sort((a, b) => b.averageAmount - a.averageAmount || a.name.localeCompare(b.name, "nl"));
}

/** Totaal per maand van alle vaste lasten. */
export function recurringMonthlyTotal(charges: readonly RecurringCharge[]): number {
  return round2(charges.reduce((sum, c) => sum + c.averageAmount, 0));
}

/**
 * De eerstvolgende datum (vandaag of later) met deze dag van de maand.
 * Bestaat de dag niet in die maand (31 november), dan de laatste dag.
 */
export function nextOccurrence(day: number, today: Date): Date {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (const offset of [0, 1]) {
    const last = new Date(start.getFullYear(), start.getMonth() + offset + 1, 0).getDate();
    const candidate = new Date(start.getFullYear(), start.getMonth() + offset, Math.min(day, last));
    if (candidate >= start) return candidate;
  }
  return start;
}

/** "YYYY-MM-DD" van de eerstvolgende keer. */
export function nextOccurrenceISO(day: number, today: Date): string {
  return toISODate(nextOccurrence(day, today));
}
