import { redirect } from "next/navigation";
import { ensureProfile, requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Een account dat jonger is dan dit telt als net geregistreerd. */
const NEW_ACCOUNT_MS = 24 * 60 * 60 * 1000;

/**
 * Meting `signup_completed`, één keer per account. Na registreren (wachtwoord,
 * e-mailbevestiging of Apple) is /onboarding altijd de eerste pagina, dus hier
 * loggen we het, zonder app/auth aan te raken.
 */
async function logSignupOnce(supabase: Supabase, userId: string, createdAt: string | null | undefined): Promise<void> {
  try {
    if (!createdAt || Date.now() - new Date(createdAt).getTime() > NEW_ACCOUNT_MS) return;
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "signup_completed");
    if ((count ?? 0) > 0) return;
    const { data } = await supabase.auth.getClaims();
    const appMeta = data?.claims.app_metadata as { provider?: unknown } | undefined;
    const method = appMeta?.provider === "apple" ? "apple" : "password";
    await logEvent("signup_completed", { method, has_invite: true });
  } catch {
    // Een meting mag de onboarding nooit breken.
  }
}

/** Bepaalt bij welke stap de gebruiker verdergaat. */
export default async function OnboardingIndexPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  if (profile.onboarding_done) redirect("/");

  const supabase = await createClient();
  await logSignupOnce(supabase, user.id, profile.created_at);

  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("archived", false)
    .is("system_key", null);

  if ((count ?? 0) === 0) redirect("/onboarding/potjes");
  redirect(profile.salary_day === null ? "/onboarding/salarisdag" : "/onboarding/bron");
}
