/**
 * Contant geld. Een pinopname is geen uitgave: het geld zit daarna in je portemonnee.
 * De app herkent de opname alleen aan de banktekst en vraagt dan zelf waar het aan op ging;
 * hij deelt niets in. Pure helpers, ook bruikbaar in tests en clientcode.
 */

/** Zoveel potjes kun je hooguit in één keer vullen vanuit één opname (net zoveel als er potjes kunnen zijn). */
export const MAX_CASH_SPENDS = 30;
/** Korte notitie bij een contante uitgave ("markt", "kapper"). */
export const CASH_NOTE_MAX = 60;
/** Tegenpartij van een contante uitgave; er is geen bank die een naam meestuurt. */
export const CASH_COUNTERPARTY = "Contant";

export interface CashCandidate {
  counterparty?: string | null;
  description?: string | null;
  rawCounterparty?: string | null;
  rawDescription?: string | null;
  amount: number;
}

/**
 * Tekens van een geldautomaat bij Nederlandse banken en in het buitenland. Woordgrenzen,
 * zodat "Geldmaatschappij", "Patmos" en "Cashback" niet meetellen.
 */
const ATM_PATTERNS: RegExp[] = [
  /\bgeldmaat\b/i,
  /\bgeldautomaa?t(en)?\b/i,
  /\bgeldopname\b/i,
  /\b(contante|cash)\s*opname\b/i,
  /\bATM\b/i,
  /\bcash\s*withdrawal\b/i,
  /\bcashpoint\b/i,
  /\bbankomat\b/i,
  /\bdistributeur\b/i,
  /\bcajero\b/i,
];

/** Portugees: "Levantamento" via Multibanco is een opname, "Compra" een gewone betaling. */
const MULTIBANCO = /\bmultibanco\b/i;
const MULTIBANCO_PURCHASE = /\bcompra\b/i;

/** ABN AMRO en ING zetten "GEA" (geldautomaat) in hoofdletters voor een opname; "Gea" is ook een voornaam. */
const GEA = /(^|\s)GEA(\s+NR\b|\s*[,:])/;

/** Losse woorden die alleen samen met een uitsluiting iets betekenen. */
const LOOSE_OPNAME = /\bopname\b/i;
const LOOSE_CASH = /\bcash\b/i;

/** Wel los "cash" of "opname" in de tekst, maar geen opname bij een automaat. */
const NOT_ATM: RegExp[] = [
  /\bcash[\s-]*back\b/i,
  /\bcash\s*(&|and|en|n)\s*carry\b/i,
  /\bcash\s*converters?\b/i,
  /\bcash\s*app\b/i,
  // Geld van je spaarrekening opnemen is een overboeking, geen pinopname.
  /\bspaar|\bsparen\b|\bdeposito\b/i,
];

/**
 * Is dit een pinopname? Alleen geld dat eraf gaat (bedrag < 0) en een banktekst die op een
 * geldautomaat wijst: Geldmaat, GEA, geldautomaat, ATM, (geld)opname, Cash withdrawal, CASH
 * (geen cashback), Bankomat, Distributeur, Cajero, Multibanco.
 */
export function isCashWithdrawal(tx: CashCandidate): boolean {
  if (!Number.isFinite(tx.amount) || tx.amount >= 0) return false;
  const parts = [tx.counterparty, tx.description, tx.rawCounterparty, tx.rawDescription].filter(
    (p): p is string => typeof p === "string" && p.trim() !== "",
  );
  if (parts.length === 0) return false;
  const text = parts.join(" \n ");
  if (ATM_PATTERNS.some((re) => re.test(text))) return true;
  if (MULTIBANCO.test(text)) return !MULTIBANCO_PURCHASE.test(text);
  if (parts.some((p) => GEA.test(p.trim()))) return true;
  // Losse woorden alleen zonder uitsluiting: "Cashback", "Cash & Carry", "opname spaarrekening".
  if (NOT_ATM.some((re) => re.test(text))) return false;
  return LOOSE_OPNAME.test(text) || LOOSE_CASH.test(text);
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export interface CashWithdrawalLite {
  id: string;
  /** Negatief, zoals de bank hem stuurt. */
  amount: number;
  bookingDate: string;
  createdAt?: string;
}

export interface CashSpendLite {
  cashWithdrawalId: string | null;
  /** Negatief: een uitgave. */
  amount: number;
}

export interface CashBucket {
  withdrawalId: string;
  bookingDate: string;
  /** Wat er van deze opname nog over is (nooit onder nul). */
  remaining: number;
}

/**
 * Per opname wat er nog over is: het opgenomen bedrag min de contante uitgaven die eraan
 * hangen, per opname afgekapt op nul. Oudste opname eerst.
 */
export function cashBuckets(withdrawals: readonly CashWithdrawalLite[], spends: readonly CashSpendLite[]): CashBucket[] {
  const spent = new Map<string, number>();
  for (const s of spends) {
    if (!s.cashWithdrawalId) continue;
    spent.set(s.cashWithdrawalId, (spent.get(s.cashWithdrawalId) ?? 0) + Math.abs(Number(s.amount)));
  }
  return [...withdrawals]
    .sort(
      (a, b) =>
        a.bookingDate.localeCompare(b.bookingDate) || (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || a.id.localeCompare(b.id),
    )
    .map((w) => ({
      withdrawalId: w.id,
      bookingDate: w.bookingDate,
      remaining: Math.max(0, round2(Math.abs(Number(w.amount)) - (spent.get(w.id) ?? 0))),
    }));
}

/** "Contant over": alles wat er van de opnames nog over is. */
export function cashRemaining(buckets: readonly CashBucket[]): number {
  return round2(buckets.reduce((sum, b) => sum + b.remaining, 0));
}

/**
 * Verdeelt een contante uitgave over de opnames, oudste eerst: je geeft het oudste geld het
 * eerst uit. Past het bedrag in de oudste opname, dan is het één regel. Null als het bedrag
 * niet geldig is of meer dan er over is.
 */
export function allocateCashSpend(
  amount: number,
  buckets: readonly CashBucket[],
): { withdrawalId: string; amount: number }[] | null {
  const total = round2(amount);
  if (!Number.isFinite(total) || total <= 0 || total > cashRemaining(buckets)) return null;
  const parts: { withdrawalId: string; amount: number }[] = [];
  let left = total;
  for (const bucket of buckets) {
    if (left <= 0) break;
    if (bucket.remaining <= 0) continue;
    const take = round2(Math.min(bucket.remaining, left));
    parts.push({ withdrawalId: bucket.withdrawalId, amount: take });
    left = round2(left - take);
  }
  return left > 0 ? null : parts;
}

/** Een geldig bedrag in centen, groter dan nul. Null als het niet klopt. */
export function cashAmount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = round2(value);
  return rounded > 0 && rounded <= 100_000 ? rounded : null;
}

/** Korte notitie opschonen: trimmen, dubbele spaties weg, hooguit CASH_NOTE_MAX tekens. Leeg = null. */
export function cashNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = [...value.replace(/\s+/g, " ").trim()].slice(0, CASH_NOTE_MAX).join("");
  return text === "" ? null : text;
}
