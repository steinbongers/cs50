"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

const NOTE_MAX_LENGTH = 140;
const GENERIC = "Opslaan lukte niet. Probeer het nog eens.";
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

/**
 * Slaat een eigen notitie bij een transactie op. Lege notitie (na trimmen) wist hem.
 * De notitie zelf komt nooit in een log of meting.
 */
export async function saveNote(
  transactionId: string,
  note: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!isUuid(transactionId)) return { ok: false, error: GENERIC };

  const trimmed = typeof note === "string" ? note.trim() : "";
  // Tekens tellen zoals Postgres char_length doet (codepoints), niet UTF-16-eenheden.
  if ([...trimmed].length > NOTE_MAX_LENGTH) return { ok: false, error: "Maximaal 140 tekens." };
  const value = trimmed === "" ? null : trimmed;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({ note: value })
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .select("id");

  if (error || !data || data.length === 0) return { ok: false, error: GENERIC };

  await logEvent("note_saved", { cleared: value === null });
  refresh();
  return { ok: true };
}
