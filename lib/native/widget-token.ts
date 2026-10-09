import { createHash, randomBytes } from "node:crypto";

/**
 * Widgetsleutel: een willekeurige sleutel per gebruiker waarmee de iOS-widget zonder
 * inlogsessie zijn twee getallen ophaalt. In de database staat alleen de sha256-hash.
 */

/** 32 willekeurige bytes, als base64url: 43 tekens. */
export function generateWidgetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashWidgetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Leest `Authorization: Bearer <sleutel>`; alles wat niet op een widgetsleutel lijkt, telt niet. */
export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+([A-Za-z0-9_-]{32,128})$/.exec(header.trim());
  return match ? match[1] : null;
}
