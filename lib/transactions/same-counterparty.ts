/** Hoogstens zoveel kaartjes in één keer meenemen, zodat één tik nooit een hele maand verschuift. */
export const MAX_SAME_COUNTERPARTY = 20;

function key(counterparty: string): string {
  return counterparty.trim().toLocaleLowerCase("nl-NL").replace(/\s+/g, " ");
}

/**
 * Andere kaartjes op de stapel met dezelfde tegenpartij en dezelfde richting (uit of in).
 * De app kiest niets voor je: dit is alleen het aanbod "ook deze?", jij tikt zelf.
 */
export function sameCounterparty<T extends { id: string; counterparty: string; amount: number }>(
  picked: T,
  others: readonly T[],
): T[] {
  const k = key(picked.counterparty);
  if (!k) return [];
  const outgoing = picked.amount < 0;
  return others
    .filter((t) => t.id !== picked.id && key(t.counterparty) === k && t.amount < 0 === outgoing && t.amount !== 0)
    .slice(0, MAX_SAME_COUNTERPARTY);
}
