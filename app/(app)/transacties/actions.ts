"use server";

import { logEvent } from "@/lib/events";
import { resultsBucket } from "@/lib/transactions/search";

/**
 * Meet dat er gezocht is. Alleen een bucket van het aantal resultaten:
 * nooit de zoekterm, een tegenpartij of een bedrag.
 */
export async function logSearchUsed(resultCount: number): Promise<void> {
  await logEvent("search_used", { results_bucket: resultsBucket(Number(resultCount)) });
}
