/**
 * Creditcard-afrekening herkennen. De maandelijkse afschrijving van de creditcard bevat vaak
 * uitgaven voor meerdere potjes; de kaart geeft dan een hint om hem te verdelen. De app deelt
 * niets in: het blijft een hint. Pure helper, ook bruikbaar in tests en clientcode.
 */

export interface CreditCardCandidate {
  counterparty?: string | null;
  description?: string | null;
  rawCounterparty?: string | null;
  rawDescription?: string | null;
  amount: number;
}

/** Namen die op zichzelf al een creditcard-afrekening zijn (uitgevers en bankproducten). */
const CARD_ISSUERS: RegExp[] = [
  /\binternational\s+card\s+services\b/i,
  // ICS als los woord, in hoofdletters: "ICS", "ICS Cards", "ICS-cards". Niet "Physics" of "Ics".
  /(^|[^A-Za-z])ICS([^A-Za-z]|$)/,
  /\bics[\s-]*cards?\b/i,
  /\bamerican\s+express\b/i,
  /\bamex\b/i,
  /\brabo\s*card\b/i,
  /\brabobank\s+card\b/i,
  /\bcredit\s*-?\s*card\b/i,
  /\bcard\s+services\b/i,
];

/** Mastercard en Visa zijn ook betaalnetwerken en winkelnamen; alleen met een woord van een afrekening. */
const NETWORKS = /\b(master\s*card|visa)\b/i;
const SETTLEMENT_WORDS =
  /\b(afrekening|maandafrekening|incasso|afschrijving|rekeningoverzicht|maandoverzicht|maandbedrag|statement)\b/i;

/**
 * Is dit (waarschijnlijk) de afschrijving van een creditcard? Alleen geld dat eraf gaat, met
 * een banktekst die naar een kaartuitgever wijst (International Card Services, ICS, American
 * Express, Rabo Card, "creditcard") of naar Mastercard of Visa samen met een woord als
 * "afrekening" of "incasso". Een winkel die "Visa" in de naam heeft telt niet.
 */
export function isCreditCardSettlement(tx: CreditCardCandidate): boolean {
  if (!Number.isFinite(tx.amount) || tx.amount >= 0) return false;
  const parts = [tx.counterparty, tx.description, tx.rawCounterparty, tx.rawDescription].filter(
    (p): p is string => typeof p === "string" && p.trim() !== "",
  );
  if (parts.length === 0) return false;
  const text = parts.join(" \n ");
  if (CARD_ISSUERS.some((re) => re.test(text))) return true;
  return NETWORKS.test(text) && SETTLEMENT_WORDS.test(text);
}
