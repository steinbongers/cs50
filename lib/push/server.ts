import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import type { Database } from "@/lib/supabase/types";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

function ensureVapid(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch {
    // Ongeldige sleutel of onderwerp: niet crashen, de cron meldt het netjes.
    return false;
  }
  configured = true;
  return true;
}

/** Zijn de VAPID-gegevens aanwezig én geldig? */
export function isPushUsable(): boolean {
  return ensureVapid();
}

/**
 * Stuurt een melding naar alle apparaten van een gebruiker.
 * Verlopen abonnementen (404/410) worden opgeruimd. Geeft het aantal verzonden terug.
 */
export async function sendPushToUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!ensureVapid()) return 0;

  const { data: subscriptions } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
  if (!subscriptions || subscriptions.length === 0) return 0;

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_secret } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 12 },
      );
      sent++;
      await supabase.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", sub.id);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
      // Andere fouten: stil; de volgende ronde proberen we opnieuw.
    }
  }
  return sent;
}
