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
