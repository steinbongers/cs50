import { NextResponse } from "next/server";
import { actionSecretFromEnv, verifyActionToken } from "@/lib/native/action-token";
import { authenticateDevice, NO_STORE, readJson } from "@/lib/native/device-auth";
import { assignFromDevice, logEventFor, skipFromDevice } from "@/lib/native/payments";
import { loadWidgetPayload } from "@/lib/native/widget";
import { createAdminClient } from "@/lib/supabase/admin";

const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/**
 * Indelen zonder de app te openen.
 * - `confirm` (knop "Klopt" in een melding): alleen met de actiesleutel uit die melding, die
 *   precies deze betaling, dit potje en deze gebruiker noemt en hoogstens 48 uur oud is.
 * - `pick` (knop met een potje op de grote widget): betaling en potje moeten van deze gebruiker zijn.
 * - `later`: de betaling achteraan de stapel.
 * Altijd met de apparaatsleutel van een gekoppelde iPhone. Antwoord met `widget: true` bevat de
 * nieuwe widgetgegevens, zodat de widget meteen de volgende betaling toont.
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
  const userId = device.user_id;

  const body = await readJson(request);
  const action = body?.action;
  const transactionId = body?.transactionId;
  const source = body?.source === "widget" ? "widget" : "notification";
  if (!isUuid(transactionId)) return json({ error: "Ongeldig verzoek" }, 400);

  let outcome: "ok" | "already" | "not_found";
  let categoryId: string | null = null;
  if (action === "confirm") {
    const secret = actionSecretFromEnv();
    const claims = secret ? verifyActionToken(body?.token, secret) : null;
    if (!claims || claims.u !== userId || claims.t !== transactionId) return json({ error: "Deze knop is verlopen. Open de app." }, 403);
    categoryId = claims.c;
    outcome = await assignFromDevice(admin, userId, transactionId, categoryId);
  } else if (action === "pick") {
    if (!isUuid(body?.categoryId)) return json({ error: "Ongeldig verzoek" }, 400);
    categoryId = body.categoryId;
    outcome = await assignFromDevice(admin, userId, transactionId, categoryId);
  } else if (action === "later") {
    outcome = (await skipFromDevice(admin, userId, transactionId)) ? "ok" : "not_found";
  } else {
    return json({ error: "Ongeldig verzoek" }, 400);
  }

  if (outcome === "not_found") return json({ error: "Deze betaling of dit potje bestaat niet (meer)." }, 404);
  if (outcome === "ok") {
    await logEventFor(admin, userId, "native_assign", {
      transaction_id: transactionId,
      ...(categoryId ? { category_id: categoryId } : {}),
      source,
      action,
    });
  }

  const widget = body?.widget === true ? await loadWidgetPayload(admin, userId).catch(() => null) : null;
  return json({ ok: true, already: outcome === "already", ...(widget ? { widget } : {}) });
}
