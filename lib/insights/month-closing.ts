/**
 * Maandafsluiting: de afgelopen periode in drie getallen, voor het feestmoment
 * bij de eerste keer openen in een nieuwe salarisperiode. Geen database.
 */
import { monthReview, type CatLite, type TxLite } from "./compute";

export interface MonthClosing {
  /** Eerste dag van de afgelopen periode, "YYYY-MM-DD". */
  periodStartISO: string;
  spent: number;
  /** Het potje waar het meeste naartoe ging, of null als niets in een potje zit. */
  biggest: { categoryId: string; name: string; amount: number } | null;
  /** Aantal kaartjes uit die periode dat in een potje zit. */
  sorted: number;
}

/** Null als er in de afgelopen periode niets is uitgegeven (bijvoorbeeld je eerste maand). */
export function monthClosing(txs: TxLite[], cats: CatLite[], salaryDay: number | null, today: Date): MonthClosing | null {
  const review = monthReview(txs, cats, salaryDay, today);
  if (!review) return null;
  const { startISO, endISO } = review.period;
  const top = review.categories.find((c) => c.spent > 0) ?? null;
  const sorted = txs.filter((t) => !t.isInternal && t.categoryId !== null && t.bookingDate >= startISO && t.bookingDate < endISO).length;
  return {
    periodStartISO: startISO,
    spent: review.total,
    biggest: top ? { categoryId: top.category.id, name: top.category.name, amount: top.spent } : null,
    sorted,
  };
}
