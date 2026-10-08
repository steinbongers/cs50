import "server-only";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

/** Eventtypes voor de pilotmetingen (spec 7). */
export type EventType =
  | "app_open"
  | "swipe"
  | "swipe_session_complete"
  | "undo"
  | "skip"
  | "weekly_review_viewed"
  | "bank_connected"
  | "bank_reconnect"
  | "csv_import";

/**
 * Logt een event voor de ingelogde gebruiker. Payload bevat alleen id's,
 * aantallen en duren: nooit bedragen, tegenpartijen of omschrijvingen.
 * Fouten worden genegeerd; een meting mag de app nooit breken.
 */
export async function logEvent(type: EventType, payload: Record<string, Json> = {}): Promise<void> {
  try {
    const user = await getUser();
    if (!user) return;
    const supabase = await createClient();
    await supabase.from("events").insert({ user_id: user.id, type, payload });
  } catch {
    // bewust stil
  }
}
