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
