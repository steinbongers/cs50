import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { BANK_AUTH_COOKIE, type BankAuthCookie } from "@/lib/bank/auth-cookie";
import { ensureProfile, getUser } from "@/lib/auth";
import { hashIban, maskIban } from "@/lib/bank/mapping";
import { syncConnection } from "@/lib/bank/sync";
import { authorizeSession } from "@/lib/enablebanking/client";
import { logEvent } from "@/lib/events";
import { currentPeriod } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";

/**
 * Landingspunt na de bank: wisselt de code in voor een sessie, slaat de
 * koppeling en rekeningen op en haalt de eerste transacties binnen.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const bankError = searchParams.get("error");

  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(BANK_AUTH_COOKIE)?.value;
  cookieStore.delete(BANK_AUTH_COOKIE);

  let pending: BankAuthCookie | null = null;
  try {
    pending = rawCookie ? (JSON.parse(rawCookie) as BankAuthCookie) : null;
  } catch {
    pending = null;
  }

  const next = pending?.next ?? "/overzicht";
  // Eén keer loggen, hier en niet op de foutpagina (die kan herladen worden).
  const fail = async (reason: string) => {
    await logEvent("bank_connect_failed", { reason });
    return NextResponse.redirect(`${origin}/bank/koppelen?error=${reason}&next=${encodeURIComponent(next)}`);
  };

  if (!pending || !state || pending.state !== state) return fail("state");
  if (bankError || !code) return fail("geweigerd");

  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  let session;
  try {
    session = await authorizeSession(code);
  } catch {
    return fail("sessie");
  }

  const supabase = await createClient();
  const profile = await ensureProfile(user);

  // Eén bank per gebruiker: een bestaande koppeling wordt vernieuwd.
  const { data: existing } = await supabase
    .from("bank_connections")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "enablebanking")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const connectionValues = {
    aspsp_name: session.aspsp.name,
    session_id: session.session_id,
    valid_until: session.access.valid_until,
    status: "active" as const,
    last_error: null,
  };

  let connectionId: string;
  if (existing) {
    const { error } = await supabase.from("bank_connections").update(connectionValues).eq("id", existing.id);
    if (error) return fail("opslaan");
    connectionId = existing.id;
  } else {
    const { data, error } = await supabase
      .from("bank_connections")
      .insert({ user_id: user.id, provider: "enablebanking", ...connectionValues })
      .select("id")
      .single();
    if (error || !data) return fail("opslaan");
    connectionId = data.id;
  }

  // Rekeningen: bestaande bijwerken op uid, nieuwe toevoegen.
  const { data: knownAccounts } = await supabase.from("accounts").select("id, external_uid").eq("connection_id", connectionId);
  const knownByUid = new Map((knownAccounts ?? []).map((a) => [a.external_uid, a.id]));
  const seenUids = new Set<string>();

  for (const account of session.accounts ?? []) {
    const iban = account.account_id?.iban ?? null;
    const values = {
      iban_masked: maskIban(iban),
      iban_hash: hashIban(iban),
      name: account.name || account.product || "Rekening",
      currency: account.currency || "EUR",
    };
    const knownId = knownByUid.get(account.uid);
    seenUids.add(account.uid);
    if (knownId) {
      await supabase.from("accounts").update({ ...values, active: true }).eq("id", knownId);
    } else {
      await supabase.from("accounts").insert({ user_id: user.id, connection_id: connectionId, external_uid: account.uid, ...values });
    }
  }

  // Rekeningen die niet meer in de nieuwe toestemming zitten (andere bank, rekening
  // weggelaten) worden gedeactiveerd: de sync slaat ze over, transacties blijven.
  const vanished = (knownAccounts ?? []).filter((a) => a.external_uid && !seenUids.has(a.external_uid)).map((a) => a.id);
  if (vanished.length > 0) {
    await supabase.from("accounts").update({ active: false }).in("id", vanished);
  }

  await logEvent(existing || pending.reconnect ? "bank_reconnect" : "bank_connected", {
    connection_id: connectionId,
    accounts: session.accounts?.length ?? 0,
  });

  // Eerste transacties: vanaf de laatste salarisdag (of begin van de maand).
  const { data: connection } = await supabase.from("bank_connections").select("*").eq("id", connectionId).single();
  if (connection) {
    const period = currentPeriod(profile.salary_day);
    await syncConnection(supabase, connection, { dateFrom: period.startISO });
  }

  const target = new URL(next, origin);
  target.searchParams.set("bank", "gekoppeld");
  return NextResponse.redirect(target);
}
