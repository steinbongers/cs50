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

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Gelijk delen met centen die netjes opgaan: het restje gaat naar de laatste
 * persoon, zodat jouw deel plus alle delen exact het totaal is.
 */
export function splitEqually(totalAbs: number, persons: number): SplitResult {
  const count = Math.min(Math.max(Math.round(persons), MIN_SPLIT_PERSONS), MAX_SPLIT_PERSONS);
  const total = roundCents(Math.abs(totalAbs));
  const base = Math.floor((total * 100) / count) / 100;
  const remainder = roundCents(total - base * count);

  const ownShare = base;
  const others = Array.from({ length: count - 1 }, () => base);
  // restcenten verdelen over de anderen, beginnend bij de laatste
  let left = Math.round(remainder * 100);
  for (let i = others.length - 1; i >= 0 && left > 0; i--) {
    others[i] = roundCents(others[i] + 0.01);
    left--;
  }
  return { ownShare, otherShares: others };
}
