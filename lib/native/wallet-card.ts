/**
 * Met welke kaart is een Apple Pay-betaling gedaan? Opdrachten geeft de naam door zoals hij in
 * Wallet staat ("ING Betaalpas", "Visa Card"), geen kaartnummer.
 *
 * Een creditcardbetaling komt nooit als losse regel via de bank: de bank schrijft één keer per
 * maand het totaal af. Daarom zoekt zo'n betaling geen bankregel om mee samen te gaan, en telt
 * hij mee bij "al ingedeeld via Apple Pay" op de maandafrekening.
 */

export type CardKind = "credit" | "debit";
export type CardChoices = Record<string, CardKind>;

export const MAX_CARD_LENGTH = 60;
export const MAX_CARDS = 12;

export function cleanWalletCard(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const text = input.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_CARD_LENGTH).trim();
  return text === "" ? null : text;
}

function cardKey(name: string): string {
  return name.toLocaleLowerCase("nl-NL").replace(/\s+/g, " ").trim();
}

/**
 * Gok op basis van de naam, tot de gebruiker zelf kiest. "Debit Mastercard" en "Betaalpas" zijn
 * geen creditcard, ook al staat er Mastercard of Visa in.
 */
export function guessCardKind(name: string): CardKind {
  const text = cardKey(name);
  if (/\b(debit|debet|betaalpas|bankpas|pinpas|maestro|v pay|vpay)\b/.test(text)) return "debit";
  if (/\b(credit|creditcard|visa|mastercard|american express|amex|ics|platinum|gold)\b/.test(text)) return "credit";
  return "debit";
}

/** Eigen keuze van de gebruiker gaat voor; anders de gok. Zonder kaartnaam: onbekend (null). */
export function cardKind(name: string | null | undefined, choices: CardChoices): CardKind | null {
  if (!name) return null;
  const key = cardKey(name);
  for (const [stored, kind] of Object.entries(choices)) if (cardKey(stored) === key) return kind;
  return guessCardKind(name);
}

/** Leest de opgeslagen keuzes (jsonb uit profiles.wallet_cards); alles wat er niet op lijkt valt weg. */
export function parseCardChoices(value: unknown): CardChoices {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const out: CardChoices = {};
  for (const [name, kind] of Object.entries(value as Record<string, unknown>)) {
    const clean = cleanWalletCard(name);
    if (clean && (kind === "credit" || kind === "debit") && Object.keys(out).length < MAX_CARDS) out[clean] = kind;
  }
  return out;
}

// --- Maandafrekening van de creditcard ---------------------------------------------------

export interface CardPayment {
  id: string;
  booking_date: string;
  /** Negatief (uitgave). */
  amount: number;
}

export interface SettlementCoverage {
  /** Betalingen die in deze afrekening passen, oudste eerst. */
  ids: string[];
  coveredCents: number;
  /** Wat er van de afrekening overblijft (aankopen zonder Apple Pay, rente, kosten). */
  restCents: number;
  /** Boekdatum van de laatste betaling die meetelt, of null. */
  until: string | null;
}

/**
 * Welke creditcardbetalingen (via Apple Pay al ingedeeld) zitten in deze afrekening?
 * Een afrekening dekt een aaneengesloten periode, dus we nemen de oudste betalingen tot het
 * bedrag van de afrekening vol is. Een betaling die er niet meer in past, en alles daarna,
 * hoort bij de volgende afrekening. Het blijft een schatting: de gebruiker ziet het bedrag
 * en beslist zelf.
 */
export function settlementCoverage(settlementAmount: number, payments: readonly CardPayment[]): SettlementCoverage {
  const total = Math.round(Math.abs(settlementAmount) * 100);
  const sorted = [...payments].filter((p) => p.amount < 0).sort((a, b) => (a.booking_date < b.booking_date ? -1 : a.booking_date > b.booking_date ? 1 : 0));
  const ids: string[] = [];
  let covered = 0;
  let until: string | null = null;
  for (const p of sorted) {
    const cents = Math.round(Math.abs(p.amount) * 100);
    if (covered + cents > total) break;
    covered += cents;
    ids.push(p.id);
    until = p.booking_date;
  }
  return { ids, coveredCents: covered, restCents: total - covered, until };
}
