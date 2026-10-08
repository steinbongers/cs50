import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/supabase/types";

export interface CurrentUser {
  id: string;
  email: string | null;
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
  return { id: data.claims.sub, email };
});

/** Vereist een sessie; stuurt anders door naar /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getUser();
  if (!user) redirect("/login");
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
