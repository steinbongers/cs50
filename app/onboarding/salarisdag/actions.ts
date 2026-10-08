"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

/**
 * Slaat de salarisdag op en logt `onboarding_step_done`, alleen als het opslaan echt
 * lukte. Daarna door naar de bankstap. Bij een fout komt er een melding terug.
 */
export async function submitSalaryDay(day: number | null): Promise<{ error: string } | undefined> {
  const user = await requireUser();
  if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) {
    return { error: "Kies een dag tussen 1 en 31." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert({ id: user.id, salary_day: day }, { onConflict: "id" });
  if (error) return { error: "Opslaan lukte niet. Probeer het opnieuw." };
  await logEvent("onboarding_step_done", { step: "salarisdag", salary_day_set: day !== null });
  redirect("/onboarding/bron");
}
