import { toISODate } from "@/lib/format";
import { currentPeriod, previousPeriod } from "@/lib/periods";
import { counterpartyKey } from "@/lib/transactions/same-counterparty";

/**
 * Je vaste maand. De gebruiker ziet zijn lopende salarismaand tot nu toe als lijst per verkoper en tikt aan
 * wat elke maand terugkomt: vaste kosten en vaste inkomsten. Daarmee rekent de app uit wat er
 * deze maand nog over is. De app vinkt zelf niets aan; hij zet alleen bovenaan wat er het meest
 * als vast uitziet. Pure functies, zonder database.
 */

export type Direction = "uit" | "in";

/** Zoveel dagen moet de lopende maand oud zijn om er vaste posten uit te kunnen kiezen. */
export const FIXED_WINDOW_MIN_DAYS = 14;

export interface FixedWindow {
  /** Eerste dag (inclusief) en eerste dag erna (exclusief), "YYYY-MM-DD". */
  startISO: string;
  endISO: string;
  /** true: de lopende maand tot en met vandaag; false: de hele vorige maand. */
  current: boolean;
}

/**
 * Uit welke periode kiest de gebruiker zijn vaste posten? De lopende salarismaand, van de
 * salarisdag tot en met vandaag (besluit van Stein). Is die maand nog maar net begonnen, dan
 * staat er te weinig in en nemen we de hele vorige maand.
 */
export function fixedWindow(salaryDay: number | null | undefined, today: Date): FixedWindow {
  const period = currentPeriod(salaryDay, today);
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysIn = Math.round((day.getTime() - period.start.getTime()) / 864e5);
  if (daysIn >= FIXED_WINDOW_MIN_DAYS) {
    const tomorrow = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    return { startISO: period.startISO, endISO: toISODate(tomorrow), current: true };
  }
  const previous = previousPeriod(salaryDay, today);
  return { startISO: previous.startISO, endISO: previous.endISO, current: false };
}

interface MonthTx {
  bookingDate: string;
  /** Negatief = uitgave, positief = inkomst. */
  amount: number;
  counterparty: string | null;
}

export interface MonthGroup {
  key: string;
  direction: Direction;
  /** Tegenpartij zoals op het laatste kaartje. */
  name: string;
  /** Totaal in die maand, positief. */
  total: number;
  count: number;
  /** Ziet eruit als iets dat elke maand terugkomt (alleen voor de volgorde, niets wordt aangevinkt). */
  likely: boolean;
}

const cents = (n: number) => Math.round(n * 100);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Woorden die op een vaste last of vaste inkomst wijzen. */
const LIKELY_OUT =
  /huur|hypothe|verzeker|zorg|energie|eneco|vattenfall|essent|greenchoice|water|gemeente|belasting|internet|ziggo|kpn|odido|t-mobile|vodafone|simyo|telefoon|abonnement|spotify|netflix|disney|videoland|youtube|icloud|apple\.com|sportschool|basic-fit|fitness|duo|kinderopvang|contributie|incasso|woning|servicekosten|ns groep|ov-chipkaart/i;
const LIKELY_IN = /salaris|loon|uitkering|toeslag|belastingdienst|duo|studiefinanciering|pensioen|uwv|svb|payroll|werkgever/i;

/**
 * Groepeert de betalingen van één maand per tegenpartij en richting. Bovenaan wat er als vast
 * uitziet (één of twee keer in de maand, of een bekend woord), daarna op bedrag.
 */
export function groupMonth(txs: readonly MonthTx[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup & { last: string }>();
  for (const tx of txs) {
    if (!Number.isFinite(tx.amount) || tx.amount === 0) continue;
    const key = counterpartyKey(tx.counterparty ?? "");
    if (!key) continue;
    const direction: Direction = tx.amount < 0 ? "uit" : "in";
    const id = `${direction}:${key}`;
    const g = groups.get(id) ?? { key, direction, name: tx.counterparty!.trim(), total: 0, count: 0, likely: false, last: "" };
    g.total = round2(g.total + Math.abs(tx.amount));
    g.count++;
    if (tx.bookingDate >= g.last) {
      g.last = tx.bookingDate;
      g.name = tx.counterparty!.trim();
    }
    groups.set(id, g);
  }
  const list = [...groups.values()].map((g): MonthGroup => {
    const words = g.direction === "uit" ? LIKELY_OUT : LIKELY_IN;
    // Vaker dan twee keer per maand naar dezelfde ontvanger is winkelen, geen vaste last.
    const likely = g.count <= 2 && (words.test(g.name) || (g.direction === "in" && g.total >= 500));
    return { key: g.key, direction: g.direction, name: g.name, total: g.total, count: g.count, likely };
  });
  return list.sort((a, b) => Number(b.likely) - Number(a.likely) || b.total - a.total || a.name.localeCompare(b.name));
}

export interface FixedItem {
  direction: Direction;
  key: string;
  name: string;
  amount: number;
}

interface FixedTotals {
  fixedIn: number;
  fixedOut: number;
  /** Wat er per maand vrij is na de vaste kosten. */
  freePerMonth: number;
}

export function fixedTotals(items: readonly FixedItem[]): FixedTotals {
  let inCents = 0;
  let outCents = 0;
  for (const item of items) {
    if (item.direction === "in") inCents += cents(item.amount);
    else outCents += cents(item.amount);
  }
  return { fixedIn: inCents / 100, fixedOut: outCents / 100, freePerMonth: (inCents - outCents) / 100 };
}

interface CountedTx {
  amount: number;
  counterparty: string | null;
}

/**
 * Nog over deze maand = vaste inkomsten − vaste kosten + al het andere geld dat deze maand in en
 * uit ging. Een betaling aan een vaste post telt niet nog eens mee (die is al gereserveerd), ook
 * niet als hij nog moet komen. Sparen is een uitgave: wat opzij staat, is niet meer vrij.
 *
 * `txs`: de betalingen van de lopende maand die meetellen (geen eigen overboekingen, niets uit
 * Telt niet mee, geen afschrijving die al in delen is verdeeld).
 */
export function monthLeft(items: readonly FixedItem[], txs: readonly CountedTx[]): { left: number; variable: number } {
  const fixed = new Set(items.map((i) => `${i.direction}:${i.key}`));
  let variableCents = 0;
  for (const tx of txs) {
    if (!Number.isFinite(tx.amount) || tx.amount === 0) continue;
    const key = counterpartyKey(tx.counterparty ?? "");
    if (key && fixed.has(`${tx.amount < 0 ? "uit" : "in"}:${key}`)) continue;
    variableCents += cents(tx.amount);
  }
  const { freePerMonth } = fixedTotals(items);
  return { left: (cents(freePerMonth) + variableCents) / 100, variable: variableCents === 0 ? 0 : -variableCents / 100 };
}

export const MAX_FIXED_ITEMS = 60;
const MAX_FIXED_NAME = 80;

/** Controleert wat de gebruiker opslaat; alles wat niet klopt valt weg. Elke post één keer. */
export function cleanFixedItems(input: unknown): FixedItem[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: FixedItem[] = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) continue;
    const { direction, name, amount } = raw as Record<string, unknown>;
    if (direction !== "uit" && direction !== "in") continue;
    if (typeof name !== "string" || typeof amount !== "number" || !Number.isFinite(amount)) continue;
    const cleanName = name.replace(/\s+/g, " ").trim().slice(0, MAX_FIXED_NAME);
    const key = counterpartyKey(cleanName).slice(0, 120);
    const value = Math.round(amount * 100) / 100;
    if (!key || value <= 0 || value > 1_000_000) continue;
    const id = `${direction}:${key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ direction, key, name: cleanName, amount: value });
    if (out.length >= MAX_FIXED_ITEMS) break;
  }
  return out;
}
