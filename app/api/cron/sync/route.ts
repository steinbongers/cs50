import { NextResponse, type NextRequest } from "next/server";
import { syncConnection } from "@/lib/bank/sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Cron (GitHub Actions, 2x per dag): ververst alle actieve bankkoppelingen.
 * Beveiligd met CRON_SECRET. Antwoord bevat alleen aantallen.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connections, error } = await admin
    .from("bank_connections")
    .select("*")
    .eq("provider", "enablebanking")
    .in("status", ["active", "expiring"]);

  if (error) return NextResponse.json({ error: "Koppelingen konden niet worden geladen." }, { status: 500 });

  let synced = 0;
  let inserted = 0;
  let failed = 0;
  for (const connection of connections ?? []) {
    const result = await syncConnection(admin, connection);
    if (result.error) failed++;
    else synced++;
    inserted += result.inserted;
  }

  return NextResponse.json({ connections: connections?.length ?? 0, synced, failed, inserted });
}
