"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { refresh } from "next/cache";
import { MANUAL_SYNC_COOLDOWN_MS } from "@/config/app";
import { requireUser } from "@/lib/auth";
import { getPrimaryConnection, statusFor } from "@/lib/bank/connections";
import { syncConnection } from "@/lib/bank/sync";
import { verifyCredentials } from "@/lib/enablebanking/client";
import { deleteSession, startAuthorization } from "@/lib/enablebanking/client";
import { isEnableBankingConfigured } from "@/lib/enablebanking/jwt";
import { logEvent } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { BANK_AUTH_COOKIE, type BankAuthCookie } from "@/lib/bank/auth-cookie";

/** Toestemming vragen voor 90 dagen (het maximum bij de meeste Nederlandse banken). */
const CONSENT_DAYS = 90;

function safeNext(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/overzicht";
}

async function appOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Start de autorisatie bij de bank. Zet een tijdelijke cookie met de state,
 * zodat de callback kan controleren dat het antwoord bij deze poging hoort.
 * Geeft de bank-URL terug; de browser navigeert daar zelf heen (volledige
 * navigatie, want het is een externe pagina).
 */
export async function startBankConnection(
  aspspName: string,
  next: string,
  reconnect = false,
): Promise<{ url: string } | { error: string }> {
  await requireUser();
  if (!isEnableBankingConfigured()) return { error: "De bankkoppeling is nog niet ingesteld op deze server." };
  const name = typeof aspspName === "string" ? aspspName.trim().slice(0, 80) : "";
  if (!name) return { error: "Kies een bank." };

  const state = randomUUID();
  const origin = await appOrigin();
  const validUntil = new Date(Date.now() + CONSENT_DAYS * 864e5 - 36e5).toISOString();

  let url: string;
  try {
    const response = await startAuthorization({
      access: { valid_until: validUntil },
      aspsp: { name, country: "NL" },
      state,
      redirect_url: `${origin}/api/bank/callback`,
      psu_type: "personal",
      language: "nl",
    });
    url = response.url;
  } catch {
    return { error: "De bank is nu niet bereikbaar. Probeer het zo nog eens." };
  }

  const cookieStore = await cookies();
  const payload: BankAuthCookie = { state, aspsp: name, next: safeNext(next), reconnect };
  cookieStore.set(BANK_AUTH_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https"),
    path: "/",
    maxAge: 15 * 60,
  });

  return { url };
}

export type RefreshResult =
  | { ok: true; inserted: number }
  | { ok: false; error: string; retryInMinutes?: number };

/** Handmatig verversen, hoogstens eens per 15 minuten. */
export async function refreshConnection(): Promise<RefreshResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const connection = await getPrimaryConnection(supabase, user.id);
  if (!connection) return { ok: false, error: "Er is nog geen bank gekoppeld." };
  if (statusFor(connection) !== "active" && statusFor(connection) !== "expiring") {
    return { ok: false, error: "De bankkoppeling is verlopen. Koppel opnieuw." };
  }

  if (connection.last_manual_sync_at) {
    const elapsed = Date.now() - new Date(connection.last_manual_sync_at).getTime();
    if (elapsed < MANUAL_SYNC_COOLDOWN_MS) {
      const minutes = Math.ceil((MANUAL_SYNC_COOLDOWN_MS - elapsed) / 60000);
      return { ok: false, error: `Net ververst. Over ${minutes} ${minutes === 1 ? "minuut" : "minuten"} kan het weer.`, retryInMinutes: minutes };
    }
  }

  if (!(await verifyCredentials())) {
    return { ok: false, error: "De bankkoppeling is tijdelijk niet beschikbaar. Probeer het later." };
  }

  const result = await syncConnection(supabase, connection, { manual: true });
  refresh();
  if (result.error) return { ok: false, error: result.error };
  return { ok: true, inserted: result.inserted };
}

/** Koppeling verwijderen: toestemming bij Enable Banking intrekken, data blijft. */
export async function disconnectBank(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  const connection = await getPrimaryConnection(supabase, user.id);
  if (!connection) return { ok: false, error: "Er is geen bankkoppeling." };

  if (connection.session_id) {
    try {
      await deleteSession(connection.session_id);
    } catch {
      // Sessie is mogelijk al verlopen; lokaal markeren is wat telt.
    }
  }
  await supabase.from("bank_connections").update({ status: "revoked", session_id: null }).eq("id", connection.id);
  await logEvent("bank_reconnect", { connection_id: connection.id, action: "disconnect" });
  refresh();
  return { ok: true };
}
