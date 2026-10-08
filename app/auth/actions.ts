"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { consumeInviteCode, inviteCodesEnabled, isInviteCodeValid, normalizeInviteCode } from "@/lib/invites/codes";
import { INVITE_COOKIE } from "@/lib/invites/cookie";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  success?: "confirm-email" | "magic-link-sent";
  /** Ingevulde waarden, zodat het formulier na een fout niet leeg is. */
  email?: string;
  displayName?: string;
  inviteCode?: string;
};

const MIN_PASSWORD_LENGTH = 8;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Alleen relatieve paden toestaan als redirectdoel (geen open redirect). */
export async function safeNextPath(value: string | null | undefined): Promise<string> {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

async function getOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Vertaalt Supabase-foutmeldingen naar begrijpelijk Nederlands. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mailadres of wachtwoord klopt niet.";
  if (m.includes("email not confirmed")) return "Bevestig eerst je e-mailadres via de link in je mail.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Er bestaat al een account met dit e-mailadres. Log in.";
  if (m.includes("password should be at least") || m.includes("password is too short"))
    return `Je wachtwoord moet minimaal ${MIN_PASSWORD_LENGTH} tekens hebben.`;
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "Even geduld: probeer het over een minuut opnieuw.";
  if (m.includes("signups not allowed")) return "Registreren is op dit moment niet mogelijk.";
  if (m.includes("invalid email")) return "Dit e-mailadres lijkt niet te kloppen.";
  return "Er ging iets mis. Probeer het opnieuw.";
}

export async function signInWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const next = await safeNextPath(readString(formData, "next"));

  if (!isValidEmail(email)) return { error: "Vul een geldig e-mailadres in.", email };
  if (!password) return { error: "Vul je wachtwoord in.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translateAuthError(error.message), email };

  redirect(next);
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const displayName = readString(formData, "display_name").slice(0, 60);
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const inviteRaw = readString(formData, "invite_code");
  const state = { email, displayName, inviteCode: inviteRaw };

  if (!isValidEmail(email)) return { error: "Vul een geldig e-mailadres in.", ...state };
  if (password.length < MIN_PASSWORD_LENGTH)
    return { error: `Kies een wachtwoord van minimaal ${MIN_PASSWORD_LENGTH} tekens.`, ...state };

  let inviteCode: string | null = null;
  if (inviteCodesEnabled()) {
    inviteCode = normalizeInviteCode(inviteRaw);
    if (!inviteCode) return { error: "Vul je uitnodigingscode in.", ...state };
    if (!(await isInviteCodeValid(inviteCode))) {
      return { error: "Deze uitnodigingscode is niet geldig of al gebruikt.", ...state };
    }
  }

  const origin = await getOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      data: {
        ...(displayName ? { display_name: displayName } : {}),
        ...(inviteCode ? { invite_code: inviteCode } : {}),
      },
    },
  });

  if (error) return { error: translateAuthError(error.message), ...state };

  // Bestaand account met bevestigingsmail aan: Supabase geeft dan een user zonder identities terug.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "Er bestaat al een account met dit e-mailadres. Log in.", ...state };
  }

  if (inviteCode) await consumeInviteCode(inviteCode);

  if (data.session) redirect("/onboarding");

  return { success: "confirm-email", email };
}

/**
 * Inloggen met Apple. Bij registreren gaat de uitnodigingscode mee in een
 * cookie; de callback controleert hem voor nieuwe accounts.
 */
export async function startAppleSignIn(
  next: string,
  inviteRaw?: string,
): Promise<{ url: string } | { error: string }> {
  const safeNext = await safeNextPath(next);
  const origin = await getOrigin();

  if (inviteRaw !== undefined && inviteCodesEnabled()) {
    const code = normalizeInviteCode(inviteRaw);
    if (!code) return { error: "Vul je uitnodigingscode in." };
    if (!(await isInviteCodeValid(code))) return { error: "Deze uitnodigingscode is niet geldig of al gebruikt." };
    (await cookies()).set(INVITE_COOKIE, code, {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https"),
      path: "/",
      maxAge: 15 * 60,
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`, skipBrowserRedirect: true },
  });
  if (error || !data.url) return { error: "Inloggen met Apple is nu niet beschikbaar." };
  return { url: data.url };
}

export async function sendMagicLink(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readString(formData, "email");
  const next = await safeNextPath(readString(formData, "next"));
  if (!isValidEmail(email)) return { error: "Vul een geldig e-mailadres in.", email };

  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  });

  if (error) return { error: translateAuthError(error.message), email };
  return { success: "magic-link-sent", email };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/welkom");
}
