import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminUser } from "@/lib/admin/access";
import { INVITE_COOKIE } from "@/lib/invites/cookie";
import { consumeInviteCode, inviteCodesEnabled, normalizeInviteCode } from "@/lib/invites/codes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "magiclink", "recovery", "invite", "email", "email_change"];

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

/**
 * Landingspunt voor e-maillinks (bevestiging, magic link).
 * Ondersteunt zowel de PKCE-flow (?code=) als token_hash-links (?token_hash=&type=).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && typeParam && (OTP_TYPES as readonly string[]).includes(typeParam)) {
    const { error } = await supabase.auth.verifyOtp({ type: typeParam as EmailOtpType, token_hash: tokenHash });
    ok = !error;
  }
  if (!ok) return NextResponse.redirect(`${origin}/login?error=link`);

  // Gesloten pilot: een account zonder uitnodigingscode (bijvoorbeeld via Apple) moet er alsnog een hebben.
  if (inviteCodesEnabled()) {
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims.sub;
    const email = typeof data?.claims.email === "string" ? data.claims.email : null;
    const meta = data?.claims.user_metadata as { email_verified?: unknown } | undefined;
    if (userId && !isAdminUser({ email, emailVerified: meta?.email_verified === true })) {
      const { data: profile } = await supabase.from("profiles").select("invite_code").eq("id", userId).maybeSingle();
      if (!profile?.invite_code) {
        const cookieStore = await cookies();
        const pending = normalizeInviteCode(cookieStore.get(INVITE_COOKIE)?.value);
        cookieStore.delete(INVITE_COOKIE);
        const accepted = pending ? await consumeInviteCode(pending) : false;
        if (!accepted) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/registreren?error=code`);
        }
        // De kolom invite_code is voor gebruikers niet schrijfbaar; alleen de server zet hem.
        await createAdminClient().from("profiles").upsert({ id: userId, invite_code: pending }, { onConflict: "id" });
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
