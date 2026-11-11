import { formatEuro } from "@/lib/format";
import type { PreviewSetting } from "@/lib/supabase/types";

/**
 * Melding na een betaling, met knoppen "Klopt" en "Ander potje".
 * Titel hoogstens 40 tekens, tekst hoogstens 90, geen uitroeptekens.
 *
 * Vergrendelscherm (privacy by default): bedrag, winkel en potje staan er alleen in als iOS de
 * tekst zelf verbergt tot de telefoon ontgrendeld is (Voorvertoning "Indien ontgrendeld", de
 * iOS-standaard), of als de gebruiker in Instellingen zelf "Details op vergrendelscherm" aanzette.
 * Staat Voorvertoning op "Altijd", dan sturen we een melding zonder details.
 */

export const PAYMENT_CATEGORY = "PAYMENT_SUGGEST";
export const PAYMENT_CATEGORY_NO_SUGGESTION = "PAYMENT_PICK";
/** Meer nieuwe betalingen tegelijk dan dit: één samenvattende melding zonder knoppen. */
export const MAX_SINGLE_NOTIFICATIONS = 3;

export function showDetails(lockScreenDetails: boolean, previews: PreviewSetting): boolean {
  return lockScreenDetails || previews === "when_unlocked";
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export interface PaymentCopyInput {
  merchant: string | null;
  /** Bedrag van de uitgave, positief of negatief. */
  amount: number;
  categoryName: string | null;
  details: boolean;
}

export function paymentMessage(input: PaymentCopyInput): { title: string; body: string } {
  if (!input.details) {
    return input.categoryName
      ? { title: "Nieuwe betaling", body: "Klopt het voorgestelde potje? Ontgrendel om te kijken." }
      : { title: "Nieuwe betaling", body: "In welk potje? Ontgrendel om te kijken." };
  }
  const euro = formatEuro(Math.abs(input.amount));
  const where = input.merchant ? ` bij ${input.merchant}` : "";
  const title = clip(`${euro}${where}`, 40);
  const body = input.categoryName
    ? clip(`${input.categoryName}? Tik op Klopt, of kies een ander potje.`, 90)
    : "In welk potje? Kies er een, of bewaar hem voor later.";
  return { title, body };
}

export function manyPaymentsMessage(count: number): { title: string; body: string } {
  return { title: `${count} nieuwe betalingen`, body: "Ze liggen klaar op je stapel. Even indelen?" };
}

/** Geen meldingen per betaling tussen 22:00 en 07:00 in Amsterdam. */
export function isQuietHour(now: Date = new Date()): boolean {
  const hour =
    Number(new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", hour12: false }).format(now)) % 24;
  return hour >= 22 || hour < 7;
}
