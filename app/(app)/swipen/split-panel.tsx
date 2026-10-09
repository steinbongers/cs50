/**
 * "Ik krijg een deel terug" staat aan of uit. Er valt niets te kiezen: de hele uitgave gaat
 * in het potje en de app houdt bij wat er terugkomt (besluit van Stein, geen aantal personen,
 * geen via of buiten de bank). Oude verdelingen met open delen blijven gewoon werken.
 */
export interface SplitState {
  enabled: boolean;
}

export const EMPTY_SPLIT: SplitState = { enabled: false };
