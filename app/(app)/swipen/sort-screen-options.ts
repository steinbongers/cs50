import {
  CONTANT_CATEGORY,
  GELD_TERUG_CATEGORY,
  NIET_MEETELLEN_CATEGORY,
  VERDEELD_CATEGORY,
  VOORGESCHOTEN_CATEGORY,
} from "@/lib/categories/types";
import { formatEuro } from "@/lib/format";
import type { CategoryOption } from "@/lib/transactions/queries";

/** Vaste keuzes en kleine hulpjes van het sorteerscherm (sort-screen.tsx). */

export const VOORGESCHOTEN_OPTION: CategoryOption = {
  id: "voorgeschoten",
  name: VOORGESCHOTEN_CATEGORY.name,
  icon: VOORGESCHOTEN_CATEGORY.icon,
  color: VOORGESCHOTEN_CATEGORY.color,
  isIncome: false,
  isSavings: false,
  systemKey: VOORGESCHOTEN_CATEGORY.systemKey,
  spentThisPeriod: 0,
  monthlyBudget: null,
  goalAmount: null,
};

/** Telt niet mee: buiten maand, Overzicht en potjes. Het echte id kent alleen de server. */
export const NIET_MEETELLEN_OPTION: CategoryOption = {
  id: "negeer",
  name: NIET_MEETELLEN_CATEGORY.name,
  icon: NIET_MEETELLEN_CATEGORY.icon,
  color: NIET_MEETELLEN_CATEGORY.color,
  isIncome: false,
  isSavings: false,
  systemKey: NIET_MEETELLEN_CATEGORY.systemKey,
  spentThisPeriod: 0,
  monthlyBudget: null,
  goalAmount: null,
};

/** Geld terug zonder potje: gaat van het totaal af. Het echte id kent alleen de server. */
export const GELD_TERUG_OPTION: CategoryOption = {
  id: "terug",
  name: GELD_TERUG_CATEGORY.name,
  icon: GELD_TERUG_CATEGORY.icon,
  color: GELD_TERUG_CATEGORY.color,
  isIncome: false,
  isSavings: false,
  systemKey: GELD_TERUG_CATEGORY.systemKey,
  spentThisPeriod: 0,
  monthlyBudget: null,
  goalAmount: null,
};

export const CONTANT_OPTION: CategoryOption = {
  id: "contant",
  name: CONTANT_CATEGORY.name,
  icon: CONTANT_CATEGORY.icon,
  color: CONTANT_CATEGORY.color,
  isIncome: false,
  isSavings: false,
  systemKey: CONTANT_CATEGORY.systemKey,
  spentThisPeriod: 0,
  monthlyBudget: null,
  goalAmount: null,
};

/** Afschrijving verdeeld over potjes. Het echte id kent alleen de server. */
export const VERDEELD_OPTION: CategoryOption = {
  id: "verdeeld",
  name: VERDEELD_CATEGORY.name,
  icon: VERDEELD_CATEGORY.icon,
  color: VERDEELD_CATEGORY.color,
  isIncome: false,
  isSavings: false,
  systemKey: VERDEELD_CATEGORY.systemKey,
  spentThisPeriod: 0,
  monthlyBudget: null,
  goalAmount: null,
};

/**
 * Een verdeelde (of bewaarde) pinopname of een verdeelde afschrijving: wat er per potje bijkwam,
 * voor ongedaan maken.
 */
export interface PartsLocal {
  parts: { category: CategoryOption; amount: number }[];
  text: string;
}

/** Tekst in de pil na het verdelen van een pinopname. */
export function cashUndoText(parts: PartsLocal["parts"], amountAbs: number): string {
  if (parts.length === 0) return "Bewaard als contant";
  const rest = Math.round((amountAbs - parts.reduce((sum, p) => sum + p.amount, 0)) * 100) / 100;
  const where = parts.length === 1 ? `In ${parts[0].category.name}` : `In ${parts.length} potjes`;
  return rest > 0 ? `${where}, ${formatEuro(rest)} contant over` : where;
}
