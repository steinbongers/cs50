import { sign } from "node:crypto";
import { normalizePrivateKey } from "@/lib/enablebanking/private-key";

/**
 * Token voor Apple Push Notification service: ES256 met de .p8-sleutel uit Apple Developer.
 * Apple wil hoogstens één nieuw token per 20 minuten en accepteert er een tot een uur oud.
 */
export function createApnsJwt(input: { keyId: string; teamId: string; privateKey: string; now?: number }): string {
  const iat = Math.floor((input.now ?? Date.now()) / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: input.keyId })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iss: input.teamId, iat })).toString("base64url");
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
    key: normalizePrivateKey(input.privateKey),
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

/** De payload van een melding met knoppen. `category` kiest de knoppenset op de iPhone. */
export function apnsPayload(input: {
  title: string;
  body: string;
  category?: string;
  threadId?: string;
  data?: Record<string, string>;
}): string {
  return JSON.stringify({
    aps: {
      alert: { title: input.title, body: input.body },
      sound: "default",
      ...(input.category ? { category: input.category } : {}),
      ...(input.threadId ? { "thread-id": input.threadId } : {}),
    },
    ...(input.data ?? {}),
  });
}
