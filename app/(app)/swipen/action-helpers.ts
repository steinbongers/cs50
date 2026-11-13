import { MAX_SPLIT_PERSONS, MIN_SPLIT_PERSONS } from "@/lib/transactions/split";

/** Gedeelde invoertypes en controles voor de server actions van Swipen. */

export const GENERIC_ERROR = "Opslaan lukte niet. Probeer het nog eens.";

export interface SplitInput {
  /** Totaal aantal personen, inclusief jijzelf. */
  persons: number;
  /** Hoe het geld terugkomt: via je rekening (blijft open) of anders (direct afgehandeld). */
  method: "bank" | "other";
  /** Optionele namen van de anderen, in volgorde. */
  names?: string[];
}

/**
 * "Ik krijg een deel terug" zonder verdelen: de hele uitgave gaat in het potje en wacht op
 * geld terug. Wat er binnenkomt gaat ervan af; is alles binnen, dan is de rest van jou.
 */
export interface TrackInput {
  track: true;
}

/** Extra context voor de meting: stond er een coachtip open bij deze kaart? */
export interface SwipeMeta {
  coach?: boolean;
}

export function coachFlag(meta: unknown): boolean {
  return typeof meta === "object" && meta !== null && (meta as SwipeMeta).coach === true;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

export function isTrack(value: unknown): value is TrackInput {
  return typeof value === "object" && value !== null && (value as Record<string, unknown>).track === true;
}

export function isValidSplit(value: unknown): value is SplitInput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.persons === "number" &&
    Number.isInteger(v.persons) &&
    v.persons >= MIN_SPLIT_PERSONS &&
    v.persons <= MAX_SPLIT_PERSONS &&
    (v.method === "bank" || v.method === "other") &&
    (v.names === undefined || (Array.isArray(v.names) && v.names.every((n) => typeof n === "string")))
  );
}

/** De velden waaraan we een pinopname herkennen, uit een databaserij. */
export function cashCandidate(t: {
  amount: number;
  counterparty: string | null;
  description: string | null;
  raw_counterparty: string | null;
  raw_description: string | null;
}) {
  return {
    amount: Number(t.amount),
    counterparty: t.counterparty,
    description: t.description,
    rawCounterparty: t.raw_counterparty,
    rawDescription: t.raw_description,
  };
}
