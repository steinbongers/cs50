import type { CategoryIconKey } from "./icons";
import type { CategoryColor } from "./palette";

export interface DefaultCategory {
  /** Stabiele sleutel, o.a. voor het seed-script. */
  key: string;
  name: string;
  icon: CategoryIconKey;
  color: CategoryColor;
  isIncome: boolean;
}

/**
 * De twaalf standaardpotjes plus Overig (besluit '12 standaardpotjes'). Voorgeschoten komt er
 * altijd bij, maar is een systeempotje en staat hier niet in.
 *
 * De kleuren zijn zo verdeeld dat in een raster van 4 kolommen geen buren (naast of onder
 * elkaar) dezelfde kleur hebben, ook niet als er een Terugbetaling-tegel voor staat.
 * Overig staat altijd als laatste. Bestaande sleutels blijven gelijk.
 */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { key: "boodschappen", name: "Boodschappen", icon: "shopping-cart", color: "groen", isIncome: false },
  { key: "uit-eten", name: "Eten & drinken", icon: "utensils", color: "oranje", isIncome: false },
  { key: "vervoer", name: "Vervoer", icon: "car", color: "blauw", isIncome: false },
  { key: "wonen", name: "Wonen", icon: "house", color: "indigo", isIncome: false },
  { key: "abonnementen", name: "Abonnementen", icon: "repeat", color: "paars", isIncome: false },
  { key: "zorg", name: "Zorg & verzekeringen", icon: "heart-pulse", color: "rood", isIncome: false },
  { key: "kleding", name: "Kleding & verzorging", icon: "shirt", color: "roze", isIncome: false },
  { key: "uitgaan", name: "Uitgaan & vrije tijd", icon: "party-popper", color: "geel", isIncome: false },
  { key: "vakantie", name: "Vakantie", icon: "plane", color: "blauw", isIncome: false },
  { key: "cadeaus", name: "Cadeaus & goede doelen", icon: "gift", color: "paars", isIncome: false },
  { key: "sparen", name: "Sparen & beleggen", icon: "piggy-bank", color: "mint", isIncome: false },
  { key: "inkomen", name: "Inkomen", icon: "banknote", color: "groen", isIncome: true },
  { key: "overig", name: "Overig", icon: "package", color: "grijs", isIncome: false },
];

export interface QuickSuggestion {
  key: "studie" | "huisdier" | "kinderen";
  name: string;
  icon: CategoryIconKey;
  color: CategoryColor;
}

export type QuickSuggestionKey = QuickSuggestion["key"];

/** Snelle suggesties bovenaan de potje-editor. Een tik vult alleen het formulier in. */
export const QUICK_SUGGESTIONS: readonly QuickSuggestion[] = [
  { key: "studie", name: "Studie", icon: "graduation-cap", color: "indigo" },
  { key: "huisdier", name: "Huisdier", icon: "paw-print", color: "oranje" },
  { key: "kinderen", name: "Kinderen", icon: "baby", color: "geel" },
];

export function isQuickSuggestionKey(value: unknown): value is QuickSuggestionKey {
  return typeof value === "string" && QUICK_SUGGESTIONS.some((s) => s.key === value);
}

/** Korte hulpregel per standaardpotje: wat er nog meer in hoort. */
export const CATEGORY_HINTS: Record<string, string> = {
  boodschappen: "Ook drogist en markt",
  "uit-eten": "Ook koffie, lunch en bezorging",
  vervoer: "Ook auto, brandstof en parkeren",
  wonen: "Ook gemeentebelasting, internet en inboedel",
  zorg: "Ook zorgverzekering en andere verzekeringen",
  abonnementen: "Telefoon, streaming en sport",
  kleding: "Ook kapper en verzorging",
  uitgaan: "Ook film, hobby's en sport",
  cadeaus: "Ook donaties",
  vakantie: "Ook reizen en weekendjes weg",
  sparen: "Naar je spaarrekening of beleggingen",
  inkomen: "Salaris, toeslagen en ander geld dat binnenkomt",
  overig: "Voor alles wat nergens past",
};

/** Hulpregel bij een potjesnaam uit de standaardset (hoofdletterongevoelig), anders null. */
export function hintForName(name: string): string | null {
  const needle = name.trim().toLocaleLowerCase("nl-NL");
  if (needle === "") return null;
  const match = DEFAULT_CATEGORIES.find((c) => c.name.toLocaleLowerCase("nl-NL") === needle);
  return match ? (CATEGORY_HINTS[match.key] ?? null) : null;
}

export const MAX_CATEGORIES = 30;
export const MAX_CATEGORY_NAME_LENGTH = 40;
