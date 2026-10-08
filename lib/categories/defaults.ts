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

/** Startset potjes uit de spec (3.1). De gebruiker kan ze aan- en uitzetten en aanpassen. */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { key: "boodschappen", name: "Boodschappen", icon: "shopping-cart", color: "groen", isIncome: false },
  { key: "uit-eten", name: "Uit eten & drinken", icon: "utensils", color: "oranje", isIncome: false },
  { key: "vervoer", name: "Vervoer", icon: "train", color: "blauw", isIncome: false },
  { key: "wonen", name: "Wonen", icon: "house", color: "indigo", isIncome: false },
  { key: "abonnementen", name: "Abonnementen", icon: "repeat", color: "paars", isIncome: false },
  { key: "kleding", name: "Kleding", icon: "shirt", color: "roze", isIncome: false },
  { key: "uitgaan", name: "Uitgaan", icon: "party-popper", color: "geel", isIncome: false },
  { key: "sparen", name: "Sparen", icon: "piggy-bank", color: "mint", isIncome: false },
  { key: "inkomen", name: "Inkomen", icon: "banknote", color: "groen", isIncome: true },
  { key: "overig", name: "Overig", icon: "package", color: "grijs", isIncome: false },
];

export const MAX_CATEGORIES = 30;
export const MAX_CATEGORY_NAME_LENGTH = 40;
