"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUser, requireUser } from "@/lib/auth";
import { getPrimaryConnection } from "@/lib/bank/connections";
import { deleteSession } from "@/lib/enablebanking/client";
import { logEvent } from "@/lib/events";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { churnEntry } from "./churn";

type Result = { ok: true } | { ok: false; error: string };

interface SubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function isSubscription(value: unknown): value is SubscriptionInput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const keys = v.keys as Record<string, unknown> | undefined;
  return (
    typeof v.endpoint === "string" &&
    v.endpoint.startsWith("https://") &&
    typeof keys === "object" &&
    keys !== null &&
    typeof keys.p256dh === "string" &&
    typeof keys.auth === "string"
  );
}

/** Slaat een push-abonnement van dit apparaat op en zet meldingen aan. */
export async function savePushSubscription(subscription: unknown): Promise<Result> {
  const user = await requireUser();
  if (!isSubscription(subscription)) return { ok: false, error: "Het abonnement kon niet worden gelezen." };

  const supabase = await createClient();
  const userAgent = (await headers()).get("user-agent")?.slice(0, 200) ?? null;

  const { data: existing } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("endpoint", subscription.endpoint)
    .maybeSingle();

  const values = { p256dh: subscription.keys.p256dh, auth_secret: subscription.keys.auth, user_agent: userAgent };
  const { error } = existing
    ? await supabase.from("push_subscriptions").update(values).eq("id", existing.id)
    : await supabase.from("push_subscriptions").insert({ user_id: user.id, endpoint: subscription.endpoint, ...values });
  if (error) return { ok: false, error: "Opslaan lukte niet. Probeer het nog eens." };

  await supabase.from("profiles").update({ notifications_enabled: true }).eq("id", user.id);
  refresh();
  return { ok: true };
}

/** Verwijdert het abonnement van dit apparaat; zonder apparaten gaan meldingen uit. */
export async function removePushSubscription(endpoint: string | null): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();

  if (endpoint) {
    await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  }
  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) === 0) {
    await supabase.from("profiles").update({ notifications_enabled: false }).eq("id", user.id);
  }
  refresh();
  return { ok: true };
}

/** Naam aanpassen. Leeg mag: dan staat er "Geen naam ingevuld". */
export async function updateDisplayName(displayName: string): Promise<Result> {
  const user = await requireUser();
  const name = typeof displayName === "string" ? displayName.trim().slice(0, 60) : "";
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name || null })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Opslaan lukte niet. Probeer het nog eens." };
  refresh();
  return { ok: true };
}

/** Salarisdag (1 t/m 31) of null voor de gewone kalendermaand. */
export async function updateSalaryDay(salaryDay: number | null): Promise<Result> {
  const user = await requireUser();
  if (salaryDay !== null && (!Number.isInteger(salaryDay) || salaryDay < 1 || salaryDay > 31)) {
    return { ok: false, error: "Kies een dag tussen 1 en 31." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ salary_day: salaryDay }).eq("id", user.id);
  if (error) return { ok: false, error: "Opslaan lukte niet. Probeer het nog eens." };
  refresh();
  return { ok: true };
}

const PERMISSION_RESULTS = ["granted", "denied", "default"] as const;
type PermissionResult = (typeof PERMISSION_RESULTS)[number];

/** Meting: wat koos iemand bij de toestemmingsvraag voor meldingen (alleen de uitkomst). */
export async function logPushPermission(result: unknown): Promise<void> {
  if (!PERMISSION_RESULTS.includes(result as PermissionResult)) return;
  await logEvent("push_permission", { result: result as PermissionResult, context: "settings" });
}

const DELETE_UNAVAILABLE = "Verwijderen lukt nu even niet. Mail ons, dan regelen we het.";

/**
 * Account verwijderen: direct en definitief na één bevestiging in de app.
 * Alleen voor de ingelogde gebruiker zelf (sessie wordt hier op de server gecontroleerd).
 * Eerst één anonieme regel in churn_log, dan de banktoestemming intrekken, dan
 * verwijdert de service role de gebruiker; alle tabellen hangen met on delete
 * cascade aan auth.users.
 */
export async function deleteAccount(): Promise<Result> {
  const user = await getUser();
  if (!user) redirect("/login");

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: DELETE_UNAVAILABLE };
  }

  const supabase = await createClient();

  // Anonieme churn-regel: cohortweek en aantal dagen, geen user_id.
  let churnId: number | null = null;
  const { data: profile } = await supabase.from("profiles").select("created_at").eq("id", user.id).maybeSingle();
  if (profile?.created_at) {
    const { data } = await admin.from("churn_log").insert(churnEntry(profile.created_at)).select("id").maybeSingle();
    churnId = data?.id ?? null;
  }

  const connection = await getPrimaryConnection(supabase, user.id);
  if (connection?.session_id) {
    try {
      await deleteSession(connection.session_id);
    } catch {
      // toestemming kan al verlopen zijn
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    // Niet verwijderd: dan ook geen churn-regel laten staan.
    if (churnId !== null) await admin.from("churn_log").delete().eq("id", churnId);
    return { ok: false, error: DELETE_UNAVAILABLE };
  }

  await supabase.auth.signOut().catch(() => undefined);
  redirect("/welkom?verwijderd=1");
}

/** Meldingen helemaal uit, op alle apparaten. */
export async function disableNotifications(): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  await supabase.from("profiles").update({ notifications_enabled: false }).eq("id", user.id);
  refresh();
  return { ok: true };
}
