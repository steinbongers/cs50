import { cleanCounterparty } from "@/lib/transactions/clean";

/**
 * Invoer van de Opdrachten-automatisering "Transactie" (Apple Wallet). Opdrachten geeft het
 * bedrag als tekst door, afhankelijk van de taal van de iPhone: "€ 4,50", "€4.50", "4,50 EUR",
 * "1.234,56", soms met minteken. We lezen alleen euro's en alleen een redelijk bedrag.
 */

export const MAX_WALLET_AMOUNT = 10_000;
export const MAX_MERCHANT_LENGTH = 80;

/** Positief bedrag in euro's (twee decimalen), of null als het niet te lezen is. */
export function parseWalletAmount(input: unknown): number | null {
  if (typeof input === "number") return validAmount(input);
  if (typeof input !== "string") return null;
  let text = input.trim();
  if (!text || text.length > 40) return null;
  // Andere valuta dan euro: niet raden.
  if (/[$£¥]|\b(USD|GBP|CHF|JPY|SEK|DKK|NOK|PLN)\b/i.test(text)) return null;
  // Een plusteken is geld terug (retour), geen uitgave.
  if (/^(EUR|€|\s)*\+/i.test(text)) return null;
  text = text.replace(/EUR|€|\s| /gi, "").replace(/^[-−+]/, "");
  if (!/^\d{1,3}([.,]?\d{3})*([.,]\d{1,2})?$/.test(text) && !/^\d+([.,]\d{1,2})?$/.test(text)) return null;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  const decimalAt = Math.max(lastComma, lastDot);
  let normalized: string;
  if (decimalAt >= 0 && text.length - decimalAt - 1 <= 2) {
    // Het laatste scheidingsteken met hoogstens twee cijfers erna is de komma van de centen.
    normalized = text.slice(0, decimalAt).replace(/[.,]/g, "") + "." + text.slice(decimalAt + 1);
  } else {
    normalized = text.replace(/[.,]/g, "");
  }
  return validAmount(Number(normalized));
}

function validAmount(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const abs = Math.round(Math.abs(value) * 100) / 100;
  if (abs <= 0 || abs > MAX_WALLET_AMOUNT) return null;
  return abs;
}

/** Winkelnaam uit Wallet, opgeschoond zoals bankteksten; null als er niets bruikbaars staat. */
export function cleanWalletMerchant(input: unknown): string | null {
  if (typeof input !== "string") return null;
  // Geen stuurtekens; Wallet stuurt soms een regeleinde mee.
  const text = input.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, MAX_MERCHANT_LENGTH);
  if (!text) return null;
  const cleaned = cleanCounterparty(text);
  return cleaned === "Onbekende tegenpartij" ? null : cleaned;
}

/** Vergelijkingssleutel voor winkelnamen: kleine letters, alleen letters en cijfers, bekende afkortingen uitgeschreven. */
const ALIASES: [RegExp, string][] = [
  [/\bah\b/g, "albert heijn"],
  [/\bahold\b/g, "albert heijn"],
  [/\bns\b/g, "nederlandse spoorwegen"],
  [/\bmcd\b/g, "mcdonalds"],
  [/\bmc donalds\b/g, "mcdonalds"],
  [/\bjumbo supermarkten\b/g, "jumbo"],
];

/** Woorden die niets over de winkel zeggen. */
const STOP_WORDS = new Set([
  "bv", "nv", "vof", "the", "de", "het", "een", "van", "en", "bij", "nl", "nld", "to", "go", "store", "shop",
  "winkel", "filiaal", "amsterdam", "rotterdam", "utrecht", "den", "haag", "eindhoven", "groningen", "station",
]);

export function merchantTokens(name: string | null | undefined): string[] {
  let text = (name ?? "").toLocaleLowerCase("nl-NL").normalize("NFD").replace(/[̀-ͯ]/g, "");
  text = text.replace(/[^a-z0-9 ]+/g, " ").replace(/\b\d+\b/g, " ").replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of ALIASES) text = text.replace(pattern, replacement);
  return text.split(" ").filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

/** Lijken twee winkelnamen op elkaar? Eén gedeeld betekenisvol woord (3+ tekens) is genoeg. */
export function similarMerchant(a: string | null | undefined, b: string | null | undefined): boolean {
  const ta = merchantTokens(a);
  const tb = new Set(merchantTokens(b));
  if (ta.length === 0 || tb.size === 0) return false;
  if (ta.some((w) => w.length >= 3 && tb.has(w))) return true;
  // Aan elkaar geschreven: "albertheijn" tegen "albert heijn".
  const ja = ta.join("");
  const jb = [...tb].join("");
  return ja.length >= 4 && jb.length >= 4 && (ja.includes(jb) || jb.includes(ja));
}
