import { createHash } from "node:crypto";

/**
 * Ontdubbelsleutel voor een transactie (spec 3.2).
 * Met een bank-transactie-ID: "ext:<id>". Anders een hash van rekening, datum,
 * bedrag, tegenpartij, omschrijving en (indien aanwezig) het saldo erna,
 * genormaliseerd zodat kleine verschillen in hoofdletters of spaties niet tot
 * dubbelen leiden. Rekening en saldo voorkomen dat twee echte, identieke
 * betalingen (zelfde dag, bedrag en winkel) als dubbel worden gezien.
 */
export function dedupeHash(input: {
  externalId?: string | null;
  bookingDate: string; // YYYY-MM-DD
  amount: number;
  counterparty?: string | null;
  description?: string | null;
  /** Onze rekening-id; dezelfde betaling vanaf twee rekeningen is niet dubbel. */
  accountId?: string | null;
  /** Saldo na de transactie, als de bank dat meestuurt. */
  balanceAfter?: number | null;
}): string {
  if (input.externalId && input.externalId.trim() !== "") {
    return `ext:${input.externalId.trim()}`;
  }

  const normalized = [
    input.accountId ?? "",
    input.bookingDate,
    input.amount.toFixed(2),
    normalizeText(input.counterparty),
    normalizeText(input.description),
    input.balanceAfter === null || input.balanceAfter === undefined || !Number.isFinite(input.balanceAfter)
      ? ""
      : input.balanceAfter.toFixed(2),
  ].join("|");

  return `h:${createHash("sha256").update(normalized).digest("hex")}`;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}
