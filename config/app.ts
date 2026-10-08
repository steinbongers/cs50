/**
 * Centrale app-configuratie.
 * De app heeft nog geen naam: pas APP_NAME hier aan en de hele UI volgt.
 */
export const APP_NAME = "[Appnaam]";

export const APP_DESCRIPTION =
  "Swipe elke uitgave zelf naar een potje en krijg grip op je geld.";

/** Standaardvaluta voor bedragen en formattering. */
export const DEFAULT_CURRENCY = "EUR";

/** Locale voor datums en bedragen. */
export const LOCALE = "nl-NL";

/** Hoe lang de "Ongedaan maken"-knop na een swipe zichtbaar blijft (ms). */
export const UNDO_WINDOW_MS = 4000;

/** Minimale tijd tussen twee handmatige bank-syncs (ms). */
export const MANUAL_SYNC_COOLDOWN_MS = 15 * 60 * 1000;

/** Aantal dagen vóór het verlopen van een bankkoppeling waarop we waarschuwen. */
export const CONNECTION_EXPIRY_WARNING_DAYS = 7;
