"use server";

import { logEvent, openCardsBucket } from "@/lib/events";
import type { StartTab } from "@/lib/start-route";
import { countOpenTransactions } from "@/lib/transactions/queries";

const START_TABS: readonly StartTab[] = ["swipen", "overzicht", "anders"];
const TAG_PATTERN = /^[a-z-]{1,30}$/;

/**
 * De app is geopend (pilotmeting). De client geeft alleen bron, tag en tabblad door;
 * de bucket met open kaartjes bepaalt de server zelf.
 */
export async function logAppOpen(input: { source?: unknown; tag?: unknown; startTab?: unknown } = {}): Promise<void> {
  const source = input.source === "push" ? "push" : "direct";
  const startTab = START_TABS.includes(input.startTab as StartTab) ? (input.startTab as StartTab) : "anders";
  const tag = typeof input.tag === "string" && TAG_PATTERN.test(input.tag) ? input.tag : null;

  let bucket = openCardsBucket(0);
  try {
    bucket = openCardsBucket(await countOpenTransactions());
  } catch {
    // telling mislukt: dan '0', de meting mag de app nooit breken
  }

  await logEvent("app_open", {
    source,
    ...(tag ? { tag } : {}),
    start_tab: startTab,
    open_cards_bucket: bucket,
  });
}
