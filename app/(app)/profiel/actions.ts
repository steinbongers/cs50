"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

  const values = { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, user_agent: userAgent };
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

/** Meldingen helemaal uit, op alle apparaten. */
export async function disableNotifications(): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  await supabase.from("profiles").update({ notifications_enabled: false }).eq("id", user.id);
  refresh();
  return { ok: true };
}
