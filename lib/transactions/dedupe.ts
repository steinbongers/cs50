import { createHash } from "node:crypto";

/**
 * Ontdubbelsleutel voor een transactie (spec 3.2).
 * Met een bank-transactie-ID: "ext:<id>". Anders een hash van datum, bedrag,
 * tegenpartij en omschrijving, genormaliseerd zodat kleine verschillen in
 * hoofdletters of spaties niet tot dubbelen leiden.
 */
export function dedupeHash(input: {
  externalId?: string | null;
  bookingDate: string; // YYYY-MM-DD
  amount: number;
  counterparty?: string | null;
  description?: string | null;
}): string {
  if (input.externalId && input.externalId.trim() !== "") {
    return `ext:${input.externalId.trim()}`;
  }

  const normalized = [
    input.bookingDate,
    input.amount.toFixed(2),
    normalizeText(input.counterparty),
    normalizeText(input.description),
  ].join("|");

  return `h:${createHash("sha256").update(normalized).digest("hex")}`;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}
