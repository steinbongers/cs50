import { toISODate } from "@/lib/format";
import { currentPeriod } from "@/lib/periods";

/**
 * Vanaf wanneer de app kaartjes ophaalt bij het koppelen. Banken geven via PSD2
 * meestal hoogstens 90 dagen terug; ouder kan, maar dan stuurt de bank het vaak niet.
 */
export const IMPORT_FROM_OPTIONS = [
  { value: "nu", label: "Vanaf vandaag", hint: "Alleen nieuwe betalingen" },
  { value: "periode", label: "Sinds je laatste salaris", hint: "Deze maand compleet" },
  { value: "30", label: "Afgelopen 30 dagen", hint: "" },
  { value: "90", label: "Afgelopen 90 dagen", hint: "Zo ver gaan de meeste banken terug" },
] as const;

export type ImportFrom = (typeof IMPORT_FROM_OPTIONS)[number]["value"];
export const DEFAULT_IMPORT_FROM: ImportFrom = "periode";

export function isImportFrom(value: unknown): value is ImportFrom {
  return IMPORT_FROM_OPTIONS.some((o) => o.value === value);
}

/** De eerste boekdatum (ISO) die we ophalen voor deze keuze. */
export function importFromDate(choice: ImportFrom, salaryDay: number | null | undefined, today: Date = new Date()): string {
  const daysBack = (days: number) => toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days));
  switch (choice) {
    case "nu":
      return daysBack(0);
    case "30":
      return daysBack(30);
    case "90":
      return daysBack(90);
    default:
      return currentPeriod(salaryDay, today).startISO;
  }
}
