import { NextResponse } from "next/server";
import { loadFreeToSpend } from "@/lib/insights/free-to-spend";
import { countOpenTransactionsFor, type WidgetPayload } from "@/lib/native/widget";
import { bearerToken, hashWidgetToken } from "@/lib/native/widget-token";
import { createAdminClient } from "@/lib/supabase/admin";

const NO_STORE = { "Cache-Control": "private, no-store" };

function unauthorized() {
  return NextResponse.json({ error: "Widget niet gekoppeld" }, { status: 401, headers: NO_STORE });
}

/**
 * Twee getallen voor de iOS-widget: open kaartjes en vrij tot je salaris.
 * De widget heeft geen inlogsessie; hij stuurt `Authorization: Bearer <widgetsleutel>`.
 * We zoeken de sleutel op via zijn hash, met de service-role-client.
 */
export async function GET(request: Request) {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return unauthorized();

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("widget_tokens")
    .select("user_id")
    .eq("token_hash", hashWidgetToken(token))
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Even niet beschikbaar" }, { status: 503, headers: NO_STORE });
  if (!row) return unauthorized();

  try {
    const [open, free] = await Promise.all([
      countOpenTransactionsFor(supabase, row.user_id),
      // Zonder salarisdag of saldo toont de widget alleen de kaartjes.
      loadFreeToSpend(supabase, row.user_id, new Date()).catch(() => null),
    ]);
    const payload: WidgetPayload = { open, free };
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Even niet beschikbaar" }, { status: 503, headers: NO_STORE });
  }
}
