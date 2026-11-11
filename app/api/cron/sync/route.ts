import { NextResponse, type NextRequest } from "next/server";
import { syncConnection } from "@/lib/bank/sync";
import { verifyCredentials } from "@/lib/enablebanking/client";
import { createPaymentSender, notifyNewPayments } from "@/lib/native/payments";
import { sameSecret } from "@/lib/native/device-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

/**
 * Cron (GitHub Actions, 4x per dag): ververst alle actieve bankkoppelingen en stuurt daarna per
 * nieuwe, nog open uitgave een melding met knoppen naar de iPhone (zie lib/native/payments.ts).
 * Beveiligd met CRON_SECRET. Antwoord bevat alleen aantallen: de logs van Actions zijn openbaar.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !sameSecret(request.headers.get("authorization"), `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  if (!(await verifyCredentials())) {
    return NextResponse.json({ error: "Enable Banking accepteert onze applicatiesleutel niet; geen koppelingen aangeraakt." }, { status: 500 });
  }

  const admin = createAdminClient();
  // Langst niet gesynchroniseerd eerst, zodat niemand structureel achteraan blijft.
  const { data: connections, error } = await admin
    .from("bank_connections")
    .select("*")
    .eq("provider", "enablebanking")
    .in("status", ["active", "expiring"])
    .order("last_synced_at", { ascending: true, nullsFirst: true });

  if (error) return NextResponse.json({ error: "Koppelingen konden niet worden geladen." }, { status: 500 });

  let synced = 0;
  let inserted = 0;
  let failed = 0;
  let expired = 0;
  let merged = 0;
  let notified = 0;
  const sender = createPaymentSender();
  try {
    for (const connection of connections ?? []) {
      const result = await syncConnection(admin, connection);
      if (result.expired) expired++;
      else if (result.error) failed++;
      else synced++;
      inserted += result.inserted;
      merged += result.merged;
      try {
        notified += await notifyNewPayments(admin, connection.user_id, result.newIds, sender);
      } catch {
        // een melding die niet lukt, mag de rest van de ronde niet stoppen
      }
    }
  } finally {
    sender.close();
  }

  return NextResponse.json({ connections: connections?.length ?? 0, synced, failed, expired, inserted, merged, notified });
}
