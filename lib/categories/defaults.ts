import type { CategoryColor } from "./palette";

export interface DefaultCategory {
  /** Stabiele sleutel, o.a. voor het seed-script. */
  key: string;
  name: string;
  emoji: string;
  color: CategoryColor;
  isIncome: boolean;
}

/** Startset potjes uit de spec (3.1). De gebruiker kan ze aan- en uitzetten en aanpassen. */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { key: "boodschappen", name: "Boodschappen", emoji: "🛒", color: "groen", isIncome: false },
  { key: "uit-eten", name: "Uit eten & drinken", emoji: "🍽️", color: "oranje", isIncome: false },
  { key: "vervoer", name: "Vervoer", emoji: "🚆", color: "blauw", isIncome: false },
  { key: "wonen", name: "Wonen", emoji: "🏠", color: "indigo", isIncome: false },
  { key: "abonnementen", name: "Abonnementen", emoji: "🔁", color: "paars", isIncome: false },
  { key: "kleding", name: "Kleding", emoji: "👕", color: "roze", isIncome: false },
  { key: "uitgaan", name: "Uitgaan", emoji: "🎉", color: "geel", isIncome: false },
  { key: "sparen", name: "Sparen", emoji: "🐷", color: "mint", isIncome: false },
  { key: "inkomen", name: "Inkomen", emoji: "💶", color: "groen", isIncome: true },
  { key: "overig", name: "Overig", emoji: "📦", color: "grijs", isIncome: false },
];

/** Emoji-keuzes voor potjes. Bewust beperkt en overzichtelijk. */
export const CATEGORY_EMOJI_OPTIONS: readonly string[] = [
  "🛒", "🍽️", "🍕", "☕", "🍺", "🧋", "🍫", "🚆", "🚲", "🚗", "⛽", "🚕", "✈️",
  "🏠", "💡", "🔁", "📱", "🎬", "🎵", "🎮", "👕", "👟", "💄", "💇", "🛍️", "🎉",
  "🎟️", "🎁", "🐷", "💶", "🪙", "💼", "🎓", "📚", "🏋️", "⚽", "🏥", "💊", "🐶",
  "🧸", "🌱", "🎨", "🧾", "📦",
];

export const MAX_CATEGORIES = 30;
export const MAX_CATEGORY_NAME_LENGTH = 40;
