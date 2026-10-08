import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin/access";
import { inviteCodesEnabled } from "@/lib/invites/codes";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/supabase/types";

export interface CurrentUser {
  id: string;
  email: string | null;
  /** Alleen een bevestigd adres telt voor beheerrechten. */
  emailVerified: boolean;
}

/**
 * Data Access Layer voor de ingelogde gebruiker.
 * `cache` zorgt dat de sessie per request maar één keer wordt gelezen.
 */
export const getUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  const meta = data.claims.user_metadata as { email_verified?: unknown } | undefined;
  return { id: data.claims.sub, email, emailVerified: meta?.email_verified === true };
});

/**
 * Vereist een sessie; stuurt anders door naar /login.
 * Gesloten pilot: een account zonder verbruikte uitnodigingscode komt er niet in,
 * ook niet als het buiten de app om bij Supabase is aangemaakt. Beheerders
 * (bevestigd adres in ADMIN_EMAILS) zijn uitgezonderd.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  if (inviteCodesEnabled() && !isAdminUser(user)) {
    const profile = await getProfile(user.id);
    if (!profile?.invite_code) redirect("/auth/geen-toegang");
  }
  return user;
}

export const getProfile = cache(async (userId: string): Promise<ProfileRow | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
});

/** Haalt profiel op en maakt het aan als de trigger (nog) niet gelopen heeft. */
export async function ensureProfile(user: CurrentUser): Promise<ProfileRow> {
  const existing = await getProfile(user.id);
  if (existing) return existing;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Profiel kon niet worden aangemaakt.");
  }
  return data;
}
