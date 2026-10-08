/**
 * Verdeling van een uitgave over personen. Puur rekenwerk, zodat het ook in
 * tests en in de UI (voorbeeld) te gebruiken is.
 */
export const MIN_SPLIT_PERSONS = 2;
export const MAX_SPLIT_PERSONS = 20;

export interface SplitResult {
  /** Jouw deel, positief bedrag. */
  ownShare: number;
  /** Delen van de anderen, positief; sommen precies op tot het totaal min jouw deel. */
  otherShares: number[];
}

/**
 * Gelijk delen, gerekend in hele centen zodat er geen floating-point-centen
 * verdwijnen (1,14 / 2 is 0,57 + 0,57). Het restje gaat naar de laatste
 * personen, zodat jouw deel plus alle delen exact het totaal is.
 */
export function splitEqually(totalAbs: number, persons: number): SplitResult {
  const count = Math.min(Math.max(Math.round(persons), MIN_SPLIT_PERSONS), MAX_SPLIT_PERSONS);
  const totalCents = Math.round(Math.abs(totalAbs) * 100);
  const baseCents = Math.floor(totalCents / count);
  let left = totalCents - baseCents * count;

  const othersCents = Array.from({ length: count - 1 }, () => baseCents);
  // restcenten verdelen over de anderen, beginnend bij de laatste
  for (let i = othersCents.length - 1; i >= 0 && left > 0; i--) {
    othersCents[i] += 1;
    left--;
  }
  return { ownShare: baseCents / 100, otherShares: othersCents.map((c) => c / 100) };
}
