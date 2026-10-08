"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  success?: "confirm-email" | "magic-link-sent";
  email?: string;
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

  if (!isValidEmail(email)) return { error: "Vul een geldig e-mailadres in." };
  if (!password) return { error: "Vul je wachtwoord in." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translateAuthError(error.message) };

  redirect(next);
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const displayName = readString(formData, "display_name").slice(0, 60);
  const email = readString(formData, "email");
  const password = readString(formData, "password");

  if (!isValidEmail(email)) return { error: "Vul een geldig e-mailadres in." };
  if (password.length < MIN_PASSWORD_LENGTH)
    return { error: `Kies een wachtwoord van minimaal ${MIN_PASSWORD_LENGTH} tekens.` };

  const origin = await getOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      data: displayName ? { display_name: displayName } : undefined,
    },
  });

  if (error) return { error: translateAuthError(error.message) };

  // Bestaand account met bevestigingsmail aan: Supabase geeft dan een user zonder identities terug.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "Er bestaat al een account met dit e-mailadres. Log in." };
  }

  if (data.session) redirect("/onboarding");

  return { success: "confirm-email", email };
}

export async function sendMagicLink(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readString(formData, "email");
  const next = await safeNextPath(readString(formData, "next"));
  if (!isValidEmail(email)) return { error: "Vul een geldig e-mailadres in." };

  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  });

  if (error) return { error: translateAuthError(error.message) };
  return { success: "magic-link-sent", email };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/welkom");
}
