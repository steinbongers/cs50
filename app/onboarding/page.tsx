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
    .eq("archived", false);

  redirect((count ?? 0) > 0 ? "/onboarding/bron" : "/onboarding/potjes");
}
