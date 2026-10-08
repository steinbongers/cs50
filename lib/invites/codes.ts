import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const INVITE_CODE_PATTERN = /^[A-Z0-9-]{4,32}$/;

export function normalizeInviteCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase().replace(/\s+/g, "");
  return INVITE_CODE_PATTERN.test(code) ? code : null;
}

/** Controleert een uitnodigingscode zonder hem te verbruiken. */
export async function isInviteCodeValid(code: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("invite_codes").select("max_uses, uses, expires_at").eq("code", code).maybeSingle();
  if (!data) return false;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return false;
  return data.uses < data.max_uses;
}

/** Verbruikt één gebruik van een code. Geeft false als hij (inmiddels) op is. */
export async function consumeInviteCode(code: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("invite_codes").select("max_uses, uses, expires_at").eq("code", code).maybeSingle();
  if (!data) return false;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return false;
  if (data.uses >= data.max_uses) return false;
  // Alleen geslaagd als precies deze rij (met dezelfde teller) is bijgewerkt;
  // bij een gelijktijdige registratie raakt de update nul rijen.
  const { data: updated, error } = await admin
    .from("invite_codes")
    .update({ uses: data.uses + 1 })
    .eq("code", code)
    .eq("uses", data.uses)
    .select("code");
  return !error && (updated?.length ?? 0) === 1;
}

/** Zonder service key (lokaal zonder Supabase) staat de controle uit. */
export function inviteCodesEnabled(): boolean {
  return Boolean(process.env.SUPABASE_SECRET_KEY) && process.env.REQUIRE_INVITE_CODE !== "false";
}
