"use server";

import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWidgetToken, hashWidgetToken } from "./widget-token";

type Result = { ok: true; token: string } | { ok: false; error: string };

/**
 * Maakt een nieuwe widgetsleutel voor de ingelogde gebruiker en geeft hem één keer terug.
 * Een eerdere sleutel vervalt: er is er één per gebruiker. widget_tokens is alleen voor de
 * service role (authenticated heeft er geen rechten op), daarom eerst requireUser.
 */
export async function createWidgetToken(): Promise<Result> {
  const user = await requireUser();
  const token = generateWidgetToken();

  const admin = createAdminClient();
  const { error } = await admin
    .from("widget_tokens")
    .upsert(
      { user_id: user.id, token_hash: hashWidgetToken(token), created_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) return { ok: false, error: "De widget kon niet worden gekoppeld. Probeer het later opnieuw." };

  return { ok: true, token };
}
