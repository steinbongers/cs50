import { redirect } from "next/navigation";
import { ensureProfile, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Bepaalt bij welke stap de gebruiker verdergaat. */
export default async function OnboardingIndexPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  if (profile.onboarding_done) redirect("/overzicht");

  const supabase = await createClient();
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("archived", false)
    .is("system_key", null);

  if ((count ?? 0) === 0) redirect("/onboarding/potjes");
  redirect(profile.salary_day === null ? "/onboarding/salarisdag" : "/onboarding/bron");
}
