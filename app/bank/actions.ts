"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { refresh } from "next/cache";
import { MANUAL_SYNC_COOLDOWN_MS } from "@/config/app";
import { requireUser } from "@/lib/auth";
import { toISODate } from "@/lib/format";
import { amsterdamToday } from "@/lib/periods";
import { getPrimaryConnection, statusFor } from "@/lib/bank/connections";
import { syncConnection } from "@/lib/bank/sync";
import { verifyCredentials } from "@/lib/enablebanking/client";
import { deleteSession, startAuthorization } from "@/lib/enablebanking/client";
import { isEnableBankingConfigured } from "@/lib/enablebanking/jwt";
import { logEvent } from "@/lib/events";
import { ignoreOpenBefore, loadFixedItems } from "@/lib/insights/fixed-month-server";
import { MAX_FIXED_ITEMS, cleanFixedItems, fixedWindow } from "@/lib/insights/fixed-month";
import { loadTrackingStart } from "@/lib/insights/overview-start";
import { createClient } from "@/lib/supabase/server";
import { BANK_AUTH_COOKIE, type BankAuthCookie } from "@/lib/bank/auth-cookie";
import { DEFAULT_IMPORT_FROM, importFromDate, isImportFrom } from "@/lib/bank/import-from";

/** Ook gebruikt op /bank/koppelen als de koppeling niet aanstaat. */
const BANK_NOT_CONFIGURED = "Bank koppelen kan nu even niet. We zijn ermee bezig.";

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
  importFrom: string = DEFAULT_IMPORT_FROM,
): Promise<{ url: string } | { error: string }> {
  await requireUser();
  if (!isEnableBankingConfigured()) {
    await logEvent("bank_connect_failed", { reason: "niet_ingesteld" });
    return { error: BANK_NOT_CONFIGURED };
  }
  const name = typeof aspspName === "string" ? aspspName.trim().slice(0, 80) : "";
  if (!name) return { error: "Kies eerst je bank." };
  const isReconnect = reconnect === true;
  await logEvent("bank_connect_started", { reconnect: isReconnect });

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
    await logEvent("bank_connect_failed", { reason: "start" });
    return { error: "Je bank is nu even niet bereikbaar. Probeer het zo nog eens." };
  }

  const cookieStore = await cookies();
  const payload: BankAuthCookie = {
    state,
    aspsp: name,
    next: safeNext(next),
    reconnect: isReconnect,
    importFrom: isImportFrom(importFrom) ? importFrom : DEFAULT_IMPORT_FROM,
  };
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

/** Handmatig verversen, hoogstens eens per 15 minuten. Bij een fout: `sync_failed` met een vaste reden. */
export async function refreshConnection(): Promise<RefreshResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const connection = await getPrimaryConnection(supabase, user.id);
  if (!connection) {
    await logEvent("sync_failed", { reason: "geen_koppeling" });
    return { ok: false, error: "Je hebt nog geen bank gekoppeld." };
  }
  const status = statusFor(connection);
  if (status !== "active" && status !== "expiring") {
    await logEvent("sync_failed", { reason: "ontkoppeld" });
    return { ok: false, error: "Je bank is ontkoppeld. Koppel opnieuw om te verversen." };
  }

  if (connection.last_manual_sync_at) {
    const elapsed = Date.now() - new Date(connection.last_manual_sync_at).getTime();
    if (elapsed < MANUAL_SYNC_COOLDOWN_MS) {
      const minutes = Math.ceil((MANUAL_SYNC_COOLDOWN_MS - elapsed) / 60000);
      return { ok: false, error: `Net ververst. Over ${minutes} ${minutes === 1 ? "minuut" : "minuten"} kan het weer.`, retryInMinutes: minutes };
    }
  }

  if (!(await verifyCredentials())) {
    await logEvent("sync_failed", { reason: "niet_bereikbaar" });
    return { ok: false, error: "Je bank is nu even niet bereikbaar. Probeer het later nog eens." };
  }

  const result = await syncConnection(supabase, connection, { manual: true });
  refresh();
  if (result.error) {
    const disconnected = result.expired === true || result.status === "expired" || result.status === "revoked";
    // Geen banktekst in de meting of op het scherm: alleen een vaste reden.
    await logEvent("sync_failed", { reason: disconnected ? "verlopen" : "sync" });
    return {
      ok: false,
      error: disconnected
        ? "Je bank is ontkoppeld. Koppel opnieuw om te verversen."
        : "Verversen lukte niet. Probeer het zo nog eens.",
    };
  }
  return { ok: true, inserted: result.inserted };
}

/** Bij het openen van de app verversen als de laatste sync langer geleden is dan dit. */
const AUTO_SYNC_STALE_MS = 30 * 60 * 1000;

/**
 * Bij het openen van de app (de gebruiker is er zelf bij, dus geen PSD2-limiet van 4 keer per dag):
 * stilletjes verversen als de laatste sync langer dan 30 minuten geleden is. Telt niet als
 * handmatig verversen (geen wachttijd voor de knop). Fouten blijven stil; de knop meldt ze wel.
 */
export async function syncIfStale(): Promise<{ inserted: number }> {
  const user = await requireUser();
  const supabase = await createClient();
  const connection = await getPrimaryConnection(supabase, user.id);
  if (!connection) return { inserted: 0 };
  const status = statusFor(connection);
  if (status !== "active" && status !== "expiring") return { inserted: 0 };
  const last = connection.last_synced_at ? new Date(connection.last_synced_at).getTime() : 0;
  if (Date.now() - last < AUTO_SYNC_STALE_MS) return { inserted: 0 };

  try {
    const result = await syncConnection(supabase, connection);
    if (result.inserted > 0) refresh();
    return { inserted: result.inserted };
  } catch {
    return { inserted: 0 };
  }
}

/**
 * Eerdere kaartjes ophalen bij een bestaande koppeling (bijvoorbeeld de afgelopen 90 dagen).
 * Dubbele kaartjes ontstaan niet: de sync ontdubbelt. Zelfde wachttijd als verversen.
 */
export async function importEarlier(choice: string): Promise<RefreshResult> {
  const user = await requireUser();
  if (!isImportFrom(choice) || choice === "nu") return { ok: false, error: "Kies vanaf wanneer." };
  const supabase = await createClient();
  const connection = await getPrimaryConnection(supabase, user.id);
  if (!connection) return { ok: false, error: "Je hebt nog geen bank gekoppeld." };
  const status = statusFor(connection);
  if (status !== "active" && status !== "expiring") {
    return { ok: false, error: "Je bank is ontkoppeld. Koppel opnieuw om kaartjes op te halen." };
  }
  if (connection.last_manual_sync_at) {
    const elapsed = Date.now() - new Date(connection.last_manual_sync_at).getTime();
    if (elapsed < MANUAL_SYNC_COOLDOWN_MS) {
      const minutes = Math.ceil((MANUAL_SYNC_COOLDOWN_MS - elapsed) / 60000);
      return { ok: false, error: `Net opgehaald. Over ${minutes} ${minutes === 1 ? "minuut" : "minuten"} kan het weer.`, retryInMinutes: minutes };
    }
  }
  const { data: profile } = await supabase.from("profiles").select("salary_day").eq("id", user.id).maybeSingle();
  const result = await syncConnection(supabase, connection, {
    manual: true,
    dateFrom: importFromDate(choice, profile?.salary_day ?? null),
  });
  refresh();
  if (result.error) {
    await logEvent("sync_failed", { reason: result.expired ? "verlopen" : "sync" });
    return { ok: false, error: "Ophalen lukte niet. Probeer het zo nog eens." };
  }
  await logEvent("import_earlier", { choice, inserted_bucket: result.inserted === 0 ? "0" : result.inserted <= 50 ? "1-50" : "50+" });
  return { ok: true, inserted: result.inserted };
}

/** Koppeling verwijderen: toestemming bij Enable Banking intrekken, data blijft. */
export async function disconnectBank(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  const connection = await getPrimaryConnection(supabase, user.id);
  if (!connection) return { ok: false, error: "Je hebt geen bank gekoppeld." };

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

export type StartFreshResult = { ok: true; count: number } | { ok: false; error: string };

/**
 * "Begin vanaf vandaag": alle open kaartjes van vóór vandaag gaan naar Telt niet mee.
 * Niet verwijderen: de bank levert de laatste dagen bij elke ophaalronde opnieuw aan, en een
 * verwijderd kaartje zou dan gewoon terugkomen. Wat al in een potje zit, blijft staan.
 * Per kaartje terug te zetten via Alle kaartjes.
 */
export async function startFromToday(): Promise<StartFreshResult> {
  const user = await requireUser();
  const supabase = await createClient();
  let count: number;
  try {
    count = await ignoreOpenBefore(supabase, user.id, toISODate(amsterdamToday()));
  } catch {
    return { ok: false, error: "Dat lukte niet. Probeer het zo nog eens." };
  }
  // Alleen een grove maat; nooit bedragen of winkels.
  await logEvent("start_from_today", { count_bucket: count === 0 ? "0" : count <= 50 ? "1-50" : "50+" });
  refresh();
  return { ok: true, count };
}

/**
 * Haalt de lopende salarismaand tot nu toe op voor "Je vaste maand", voor wie al gekoppeld was. Wat daarbij
 * nieuw binnenkomt en ouder is dan waar je stapel begon, komt niet op de stapel (Telt niet mee).
 */
export async function fetchPreviousMonth(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  const connection = await getPrimaryConnection(supabase, user.id);
  if (!connection) return { ok: false, error: "Koppel eerst je bank." };
  const status = statusFor(connection);
  if (status !== "active" && status !== "expiring") return { ok: false, error: "Je bank is ontkoppeld. Koppel opnieuw." };
  const { data: profile } = await supabase.from("profiles").select("salary_day").eq("id", user.id).maybeSingle();
  const today = amsterdamToday();
  const cutoff = (await loadTrackingStart(supabase, user.id).catch(() => null)) ?? toISODate(today);
  const result = await syncConnection(supabase, connection, { dateFrom: fixedWindow(profile?.salary_day ?? null, today).startISO });
  if (result.error) return { ok: false, error: "Ophalen lukte niet. Probeer het zo nog eens." };
  await ignoreOpenBefore(supabase, user.id, cutoff, result.newIds).catch(() => 0);
  refresh();
  return { ok: true };
}

/**
 * Slaat de vaste kosten en vaste inkomsten op die de gebruiker heeft aangetikt. Vervangt de hele
 * lijst. De meting bevat alleen aantallen, nooit namen of bedragen.
 */
export async function saveFixedItems(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const items = cleanFixedItems(input);
  const supabase = await createClient();
  const before = await loadFixedItems(supabase, user.id);
  const { error: deleteError } = await supabase.from("fixed_items").delete().eq("user_id", user.id);
  if (deleteError) return { ok: false, error: "Opslaan lukte niet. Probeer het nog eens." };
  if (items.length > 0) {
    const { error } = await supabase.from("fixed_items").insert(
      items.map((i) => ({ user_id: user.id, direction: i.direction, counterparty_key: i.key, name: i.name, amount: i.amount })),
    );
    if (error) {
      // Terugzetten wat er stond: liever de oude lijst dan een lege.
      if (before.length > 0) {
        await supabase.from("fixed_items").insert(
          before.map((i) => ({ user_id: user.id, direction: i.direction, counterparty_key: i.key, name: i.name, amount: i.amount })),
        );
      }
      return { ok: false, error: "Opslaan lukte niet. Probeer het nog eens." };
    }
  }
  await logEvent("fixed_month_saved", {
    costs: items.filter((i) => i.direction === "uit").length,
    income: items.filter((i) => i.direction === "in").length,
  });
  refresh();
  return { ok: true };
}

export type ToggleFixedResult = { ok: true; fixed: boolean } | { ok: false; error: string };

/**
 * Tijdens het indelen: maak van de verkoper op dit kaartje een vaste post (of haal hem weer weg).
 * Het bedrag van het kaartje wordt het bedrag per maand; bestaat de post al, dan wordt het bedrag
 * bijgewerkt. Het kaartje zelf blijft op de stapel: een potje kiezen doe je daarna gewoon.
 */
export async function toggleFixedItem(input: { name: string; amount: number; fixed: boolean }): Promise<ToggleFixedResult> {
  const user = await requireUser();
  const direction = input?.amount < 0 ? "uit" : "in";
  const [item] = cleanFixedItems([{ direction, name: input?.name, amount: Math.abs(Number(input?.amount)) }]);
  if (!item) return { ok: false, error: "Dit kan niet elke maand terugkomen." };
  const supabase = await createClient();

  if (!input.fixed) {
    const { error } = await supabase
      .from("fixed_items")
      .delete()
      .eq("user_id", user.id)
      .eq("direction", item.direction)
      .eq("counterparty_key", item.key);
    if (error) return { ok: false, error: "Dat lukte niet. Probeer het nog eens." };
    refresh();
    return { ok: true, fixed: false };
  }

  const { count } = await supabase.from("fixed_items").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= MAX_FIXED_ITEMS) return { ok: false, error: "Je hebt al veel vaste kosten en inkomsten. Haal er eerst een weg in Instellingen." };
  const { error } = await supabase
    .from("fixed_items")
    .upsert(
      { user_id: user.id, direction: item.direction, counterparty_key: item.key, name: item.name, amount: item.amount },
      { onConflict: "user_id,direction,counterparty_key" },
    );
  if (error) return { ok: false, error: "Dat lukte niet. Probeer het nog eens." };
  // Alleen de richting; nooit de naam of het bedrag.
  await logEvent("fixed_item_added", { direction: item.direction, source: "swipen" });
  refresh();
  return { ok: true, fixed: true };
}
