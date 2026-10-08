/**
 * Centrale app-configuratie.
 * De app heeft nog geen naam: pas APP_NAME hier aan en de hele UI volgt.
 */
export const APP_NAME = "[Appnaam]";

export const APP_DESCRIPTION =
  "Stop elke uitgave zelf in een potje en krijg grip op je geld.";

/**
 * Naam van de hoofdactie: transacties één voor één in een potje stoppen.
 * Krijgt later een eigen, leuke naam die bij de appnaam past. Tot die tijd
 * de werknaam uit de spec. Alle UI-teksten gebruiken deze twee constanten.
 */
export const ACTION_LABEL = "Swipen"; // knop en tabblad: "Swipen"
export const ACTION_VERB = "swipen"; // in zinnen: "Nog 12 te swipen"

/** Standaardvaluta voor bedragen en formattering. */
export const DEFAULT_CURRENCY = "EUR";

/** Locale voor datums en bedragen. */
export const LOCALE = "nl-NL";

/** Hoe lang de "Ongedaan maken"-knop na een keuze zichtbaar blijft (ms). */
export const UNDO_WINDOW_MS = 4000;

/** Minimale tijd tussen twee handmatige bank-syncs (ms). */
export const MANUAL_SYNC_COOLDOWN_MS = 15 * 60 * 1000;

/** Aantal dagen vóór het verlopen van een bankkoppeling waarop we waarschuwen. */
export const CONNECTION_EXPIRY_WARNING_DAYS = 7;

/** Adres voor service en contact (Instellingen, Over de app). Vervang door een vast supportadres vóór de lancering. */
export const SUPPORT_EMAIL = "steinbongers2018@gmail.com";
