/**
 * Weekterugblik op zondag en maandag: de grootste potjes van de week (maandag tot
 * en met zondag) naast de week ervoor. Geen database; alles testbaar.
 */
import { toISODate } from "@/lib/format";
import { isExpenseCategory, round2, spentPerCategory, totalSpent, type CatLite, type TxLite } from "./compute";

export interface WeekReviewRow {
  categoryId: string;
  spent: number;
  /** Uitgegeven in hetzelfde potje de week ervoor. */
  previous: number;
  /** spent - previous: positief is meer. */
  diff: number;
}

export interface WeekReview {
  /** Maandag van de besproken week, "YYYY-MM-DD". */
  weekStartISO: string;
  /** Zondag van de besproken week, "YYYY-MM-DD". */
  weekEndISO: string;
  total: number;
  previousTotal: number;
  rows: WeekReviewRow[];
}

/** Zoveel potjes noemt de terugblik. */
export const WEEK_REVIEW_TOP = 3;

/**
 * De maandag van de week waar de terugblik over gaat. Op zondag is dat deze week
 * (die vandaag eindigt), op maandag de week die gisteren eindigde. Andere dagen: null.
 */
export function reviewWeekStart(today: Date): Date | null {
  const day = today.getDay(); // 0 = zondag, 1 = maandag
  if (day === 0) return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  if (day === 1) return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
  return null;
}

/** Null op andere dagen dan zondag en maandag, of als er die week niets in een potje is uitgegeven. */
export function weekReview(txs: readonly TxLite[], cats: Map<string, CatLite>, today: Date): WeekReview | null {
  const start = reviewWeekStart(today);
  if (!start) return null;
  const at = (days: number) => toISODate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + days));
  const from = at(0);
  const to = at(7);
  const prevFrom = at(-7);
  const list = txs as TxLite[];

  const now = spentPerCategory(list, cats, from, to);
  const before = spentPerCategory(list, cats, prevFrom, from);
  const rows: WeekReviewRow[] = [];
  for (const [categoryId, spent] of now) {
    const cat = cats.get(categoryId);
    if (!cat || !isExpenseCategory(cat) || spent <= 0) continue;
    const previous = Math.max(0, before.get(categoryId) ?? 0);
    rows.push({ categoryId, spent, previous, diff: round2(spent - previous) });
  }
  if (rows.length === 0) return null;
  rows.sort((a, b) => b.spent - a.spent);

  return {
    weekStartISO: from,
    weekEndISO: at(6),
    total: totalSpent(list, cats, from, to),
    previousTotal: totalSpent(list, cats, prevFrom, from),
    rows: rows.slice(0, WEEK_REVIEW_TOP),
  };
}
