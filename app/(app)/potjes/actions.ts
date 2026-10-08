"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ShareStatus } from "@/lib/supabase/types";

/** Markeert een openstaand deel als ontvangen of anders geregeld (of weer open). */
export async function updateShareStatus(
  shareId: string,
  status: ShareStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(shareId)) return { ok: false, error: "Onbekend deel." };
  if (!["open", "received", "settled_elsewhere"].includes(status)) return { ok: false, error: "Onbekende status." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("transaction_shares")
    .update({
      status,
      received_at: status === "open" ? null : new Date().toISOString(),
      ...(status === "open" ? { received_transaction_id: null } : {}),
    })
    .eq("id", shareId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "Opslaan lukte niet. Probeer het nog eens." };
  refresh();
  return { ok: true };
}
