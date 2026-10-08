import type { NextRequest } from "next/server";
import { logEvent } from "@/lib/events";

const TAG_PATTERN = /^[a-z-]{1,30}$/;

/**
 * Wordt door de service worker aangeroepen na een tik op een melding.
 * Logt `push_opened { tag }` voor de ingelogde gebruiker; antwoordt altijd 204,
 * ook zonder sessie of met een ongeldige tag (de meting mag nooit iets breken).
 */
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    const body: unknown = raw.length > 0 && raw.length <= 1000 ? JSON.parse(raw) : null;
    const tag = body && typeof body === "object" && "tag" in body ? (body as { tag: unknown }).tag : null;
    if (typeof tag === "string" && TAG_PATTERN.test(tag)) {
      await logEvent("push_opened", { tag });
    }
  } catch {
    // ongeldige body: niets loggen
  }
  return new Response(null, { status: 204 });
}
