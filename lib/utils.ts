/** Voegt classnames samen en laat lege waarden weg. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function assertNever(value: never): never {
  throw new Error(`Onverwachte waarde: ${String(value)}`);
}
