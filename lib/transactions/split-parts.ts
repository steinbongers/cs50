/**
 * Eén afschrijving verdelen over meerdere potjes (bijvoorbeeld de creditcard). De delen tellen
 * samen precies op tot het bedrag van de afschrijving; alles wordt in hele centen gerekend, zodat
 * er nooit een cent zoekraakt. Pure helpers, ook bruikbaar in tests en clientcode.
 */
import { formatEuro } from "@/lib/format";
import { CASH_NOTE_MAX } from "./cash";

/** Zoveel potjes kun je hooguit vullen vanuit één afschrijving (net zoveel als er potjes kunnen zijn). */
export const MAX_SPLIT_PARTS = 30;
/** Minstens twee: met één potje tik je gewoon de tegel aan. */
export const MIN_SPLIT_PARTS = 2;
/** Korte notitie per deel ("boodschappen", "jas"); even lang als bij contant. */
export const SPLIT_NOTE_MAX = CASH_NOTE_MAX;
/** Hoogste bedrag van één afschrijving dat we verdelen (in centen), ruim boven elke creditcard. */
const MAX_TOTAL_CENTS = 10_000_000;

/** Bedrag in euro's naar hele centen (altijd positief). */
export function toCents(amount: number): number {
  return Math.round(Math.abs(amount) * 100);
}

/** Centen naar wat je in een bedragveld zou typen: "12" of "12,05". */
export function centsToInput(cents: number): string {
  const value = Math.max(0, Math.round(cents));
  const euros = Math.floor(value / 100);
  const rest = value % 100;
  return rest === 0 ? String(euros) : `${euros},${String(rest).padStart(2, "0")}`;
}

/** Wat er nog te verdelen is, in centen. Negatief als er te veel is ingevuld. */
export function remainingCents(totalCents: number, partsCents: readonly number[]): number {
  return totalCents - partsCents.reduce((sum, c) => sum + c, 0);
}

/**
 * "Rest" bij een regel: deze regel krijgt precies wat er overblijft na de andere regels.
 * Nooit onder nul; is er niets meer over, dan 0 (de regel wordt leeg).
 */
export function fillRestCents(totalCents: number, otherPartsCents: readonly number[]): number {
  return Math.max(0, remainingCents(totalCents, otherPartsCents));
}

/** Korte notitie opschonen: trimmen, dubbele spaties weg, hooguit SPLIT_NOTE_MAX tekens. Leeg = null. */
export function splitNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = [...value.replace(/\s+/g, " ").trim()].slice(0, SPLIT_NOTE_MAX).join("");
  return text === "" ? null : text;
}

export interface SplitPartInput {
  categoryId: string;
  /** Positief bedrag in euro's. */
  amount: number;
  /** Optionele notitie bij dit deel. */
  note?: string | null;
}

export interface ValidSplitPart {
  categoryId: string;
  /** Positief, in hele centen. */
  cents: number;
  note: string | null;
}

export type SplitPartsCheck =
  | { ok: true; parts: ValidSplitPart[] }
  | { ok: false; reason: "count" | "amount" | "duplicate" | "sum" };

/**
 * Controleert de delen tegen het bedrag van de afschrijving (negatief of positief): minstens
 * twee en hooguit MAX_SPLIT_PARTS delen, elk boven € 0 met hooguit twee decimalen, elk potje
 * één keer, en samen in centen precies het bedrag. Het potje zelf controleert de server.
 */
export function checkSplitParts(parentAmount: number, parts: unknown): SplitPartsCheck {
  if (!Array.isArray(parts) || parts.length < MIN_SPLIT_PARTS || parts.length > MAX_SPLIT_PARTS) {
    return { ok: false, reason: "count" };
  }
  const totalCents = toCents(parentAmount);
  if (!Number.isFinite(parentAmount) || totalCents <= 0 || totalCents > MAX_TOTAL_CENTS) return { ok: false, reason: "amount" };

  const valid: ValidSplitPart[] = [];
  const seen = new Set<string>();
  for (const part of parts as unknown[]) {
    if (typeof part !== "object" || part === null) return { ok: false, reason: "amount" };
    const { categoryId, amount, note } = part as Record<string, unknown>;
    if (typeof categoryId !== "string" || categoryId === "") return { ok: false, reason: "amount" };
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "amount" };
    const cents = Math.round(amount * 100);
    // Meer dan twee decimalen is geen bedrag dat iemand intypt.
    if (Math.abs(amount * 100 - cents) > 1e-6 || cents <= 0) return { ok: false, reason: "amount" };
    if (seen.has(categoryId)) return { ok: false, reason: "duplicate" };
    seen.add(categoryId);
    valid.push({ categoryId, cents, note: splitNote(note) });
  }
  if (remainingCents(totalCents, valid.map((p) => p.cents)) !== 0) return { ok: false, reason: "sum" };
  return { ok: true, parts: valid };
}

/** Tekst bij een verdeelde afschrijving in lijsten en in de pil: "Verdeeld over 3 potjes". */
export function splitSummary(parts: number): string {
  return parts === 1 ? "Verdeeld over 1 potje" : `Verdeeld over ${parts} potjes`;
}

/** Regel onder een deel in lijsten: "Deel van ICS Creditcard (€ 450,00)". */
export function splitPartLine(parentCounterparty: string, parentAmount: number): string {
  return `Deel van ${parentCounterparty} (${formatEuro(Math.abs(parentAmount))})`;
}
