"use server";

import { logEvent } from "@/lib/events";

/** Eén keer per browsersessie: de app is geopend (pilotmeting). */
export async function logAppOpen(): Promise<void> {
  await logEvent("app_open");
}
