import { NextResponse } from "next/server";
import { authenticateDevice, NO_STORE, readJson } from "@/lib/native/device-auth";
import { receiveWalletPayment } from "@/lib/native/payments";
import { cleanWalletMerchant, parseWalletAmount } from "@/lib/native/wallet";
import { cleanWalletCard } from "@/lib/native/wallet-card";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PreviewSetting } from "@/lib/supabase/types";

/** Meer Apple Pay-betalingen per dag dan dit is geen echt gebruik meer. */
const MAX_PER_DAY = 100;
const PREVIEWS = new Set<PreviewSetting>(["always", "when_unlocked", "never"]);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/**
 * Apple Pay-betaling uit de Opdrachten-automatisering "Transactie" (App Intent "Betaling indelen").
 * De iPhone meldt zich met zijn apparaatsleutel. Antwoord: de tekst en knoppen voor de lokale
 * melding, of `quiet` als er niets te melden is. Logt nooit winkel of bedrag.
 */
export async function POST(request: Request) {
  const admin = createAdminClient();
  let device;
  try {
    device = await authenticateDevice(admin, request);
  } catch {
    return json({ error: "Even niet beschikbaar" }, 503);
  }
  if (!device) return json({ error: "Niet gekoppeld" }, 401);

  const body = await readJson(request);
  const amount = parseWalletAmount(body?.amount);
  const merchant = cleanWalletMerchant(body?.merchant) ?? "Apple Pay";
  if (amount === null) return json({ error: "Bedrag niet te lezen" }, 422);
  const previews = PREVIEWS.has(body?.previews as PreviewSetting) ? (body!.previews as PreviewSetting) : device.previews;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", device.user_id)
    .eq("source", "applepay")
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_DAY) return json({ error: "Te veel betalingen vandaag" }, 429);

  if (previews !== device.previews) await admin.from("native_devices").update({ previews }).eq("id", device.id);

  const card = cleanWalletCard(body?.card);
  const result = await receiveWalletPayment(admin, { userId: device.user_id, merchant, amount, card, previews });
  if (result.status === "error") return json({ error: "Opslaan lukte niet" }, 500);
  return json(result);
}
