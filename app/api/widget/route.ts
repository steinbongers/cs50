import { NextResponse } from "next/server";
import { authenticateWidget, NO_STORE } from "@/lib/native/device-auth";
import { loadWidgetPayload } from "@/lib/native/widget";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Gegevens voor de iOS-widget: open kaartjes, vrij tot je salaris en (voor de grote widget)
 * de oudste open betaling met potjesknoppen. De widget heeft geen inlogsessie; hij stuurt
 * `Authorization: Bearer <apparaatsleutel>` (of de oude widgetsleutel van een eerdere build).
 * We zoeken de sleutel op via zijn hash, met de service-role-client.
 */
export async function GET(request: Request) {
  const supabase = createAdminClient();
  let userId: string | null;
  try {
    userId = await authenticateWidget(supabase, request);
  } catch {
    return NextResponse.json({ error: "Even niet beschikbaar" }, { status: 503, headers: NO_STORE });
  }
  if (!userId) return NextResponse.json({ error: "Widget niet gekoppeld" }, { status: 401, headers: NO_STORE });

  try {
    return NextResponse.json(await loadWidgetPayload(supabase, userId), { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Even niet beschikbaar" }, { status: 503, headers: NO_STORE });
  }
}
