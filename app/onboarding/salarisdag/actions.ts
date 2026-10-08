"use server";

import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { saveSalaryDay } from "../actions";

/**
 * Slaat de salarisdag op via `saveSalaryDay` en logt `onboarding_step_done`.
 * `saveSalaryDay` stuurt bij succes door (redirect gooit); bij een fout geeft hij
 * een object terug. Inloggen is hiervoor al gecontroleerd, dus een gooi hier is
 * de doorverwijzing naar de volgende stap: dan pas loggen we.
 */
export async function submitSalaryDay(day: number | null): Promise<{ error: string } | undefined> {
  await requireUser();
  if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) {
    return { error: "Kies een dag tussen 1 en 31." };
  }
  try {
    return await saveSalaryDay(day);
  } catch (redirectOrError) {
    await logEvent("onboarding_step_done", { step: "salarisdag", salary_day_set: day !== null });
    throw redirectOrError;
  }
}
