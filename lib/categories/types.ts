/** Potje-concept zoals de editor het bewerkt; gedeeld door onboarding en hoofdscherm. */
export interface CategoryDraft {
  /** Aanwezig als het potje al in de database staat. */
  id?: string;
  name: string;
  icon: string;
  color: string;
  isIncome: boolean;
  enabled: boolean;
}

/** Vaste gegevens van het ingebouwde potje Voorgeschoten. */
export const VOORGESCHOTEN_CATEGORY = {
  systemKey: "voorgeschoten",
  name: "Voorgeschoten",
  icon: "hand-coins",
  color: "geel",
} as const;

/**
 * Vaste gegevens van het ingebouwde potje Telt niet mee: kaartjes die je bewust buiten je
 * maand, Overzicht en potjes houdt (een borg, iets zakelijks, geld dat je voor een ander doorsluist).
 */
export const NIET_MEETELLEN_CATEGORY = {
  systemKey: "negeer",
  name: "Telt niet mee",
  icon: "tag",
  color: "grijs",
} as const;

/**
 * Vaste gegevens van het ingebouwde potje Geld terug: terugbetalingen zonder potje.
 * Ze gaan van je totaal af (minder uitgegeven), maar van geen enkel potje.
 */
export const GELD_TERUG_CATEGORY = {
  systemKey: "terug",
  name: "Geld terug",
  icon: "receipt",
  color: "blauw",
} as const;

/** Vaste gegevens van het ingebouwde potje Contant: pinopnames die nog in je portemonnee zitten. */
export const CONTANT_CATEGORY = {
  systemKey: "contant",
  name: "Contant",
  icon: "wallet",
  color: "groen",
} as const;

/**
 * Vaste gegevens van het ingebouwde potje Verdeeld: afschrijvingen (vaak de creditcard) die over
 * meerdere potjes zijn verdeeld. De afschrijving zelf telt niet mee; de delen tellen in hun eigen potje.
 */
export const VERDEELD_CATEGORY = {
  systemKey: "verdeeld",
  name: "Verdeeld",
  icon: "credit-card",
  color: "grijs",
} as const;
