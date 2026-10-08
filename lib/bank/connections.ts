import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONNECTION_EXPIRY_WARNING_DAYS } from "@/config/app";
import type { BankConnectionRow, ConnectionStatus, Database } from "@/lib/supabase/types";

/** De (enige) bankkoppeling van een gebruiker, de nieuwste als er meer zijn. */
export async function getPrimaryConnection(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<BankConnectionRow | null> {
  const { data } = await supabase
    .from("bank_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "enablebanking")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** Dagen tot de toestemming verloopt; negatief als al verlopen. */
export function daysUntil(validUntil: string | null | undefined, now = new Date()): number | null {
  if (!validUntil) return null;
  const ms = new Date(validUntil).getTime() - now.getTime();
  return Math.floor(ms / 864e5);
}

/** Status op basis van de geldigheid; 'revoked' blijft altijd 'revoked'. */
export function statusFor(connection: Pick<BankConnectionRow, "valid_until" | "status">, now = new Date()): ConnectionStatus {
  if (connection.status === "revoked") return "revoked";
  const days = daysUntil(connection.valid_until, now);
  if (days === null) return connection.status;
  if (days < 0) return "expired";
  if (days <= CONNECTION_EXPIRY_WARNING_DAYS) return "expiring";
  return "active";
}
