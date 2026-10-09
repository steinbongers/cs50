import "server-only";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

/**
 * Eventtypes voor de pilotmetingen (spec 7).
 *
 * Payloads bevatten alleen id's, enums, aantallen, duren en buckets:
 * nooit bedragen, tegenpartijen, omschrijvingen, notities of namen.
 */
export type EventType =
  /**
   * App geopend, één keer per browsersessie.
   * `{ source: 'push' | 'direct', tag?: string, start_tab: 'swipen' | 'overzicht' | 'anders',
   *    open_cards_bucket: '0' | '1-5' | '6-20' | '20+' }` (zie `openCardsBucket`).
   */
  | "app_open"
  /**
   * Transactie in een potje gezet.
   * `{ transaction_id, category_id, duration_ms, skipped_before?, split_persons?, split_method?,
   *    repayment_shares?, coach: boolean, flow: 'normal' | 'repayment' | 'rule' | 'cash' | 'refund', with_category? }`
   */
  | "swipe"
  /** Transactie verplaatst via de detailpagina. `{ transaction_id, category_id }` */
  | "transaction_moved"
  /** Stapel leeg gemaakt. `{ assigned, skipped, undone, duration_ms }` (aantallen en duur) */
  | "swipe_session_complete"
  /**
   * "Ook de andere van deze winkel": meerdere kaartjes in één keer in hetzelfde potje.
   * `{ category_id, count }` (telt niet als swipe; geen duur per kaart)
   */
  | "bulk_assign"
  /** "Ook de andere" ongedaan gemaakt. `{ count }` */
  | "bulk_undo"
  /** Vaste ontvanger ingesteld (potje ingedrukt gehouden). `{ category_id, applied, replaced }` */
  | "rule_created"
  /** Vaste ontvanger weggehaald. `{ reverted }` (aantal kaartjes terug op de stapel) */
  | "rule_removed"
  /**
   * Pinopname verdeeld of bewaard als contant (op Swipen). `{ spends, kept: 'none' | 'some' | 'all' }`
   * (aantal potjes en of er iets in je portemonnee blijft; nooit bedragen of de notitie)
   */
  | "cash_split"
  /** Contante uitgave toegevoegd vanaf "Contant over" op Overzicht. `{ category_id, parts }` (aantal opnames) */
  | "cash_spend_added"
  /** Laatste keuze ongedaan gemaakt. `{ transaction_id }` */
  | "undo"
  /** Kaart op Later gezet. `{ transaction_id, skipped_count }` */
  | "skip"
  /** Afgelopen maand bekeken. `{ period_start }` (ISO-datum) */
  | "month_review_viewed"
  /**
   * Pushmelding verstuurd (server). `{ open_cards_bucket?, tag? }`
   * `tag` is een vaste waarde: 'kaartjes' | 'jouw-maand' | 'week' | 'bank-verloopt' (ook in `app_open` en `push_opened`).
   */
  | "push_sent"
  /** Bank gekoppeld. `{ connection_id, accounts }` */
  | "bank_connected"
  /** Bank opnieuw gekoppeld of ontkoppeld. `{ connection_id, accounts?, action? }` */
  | "bank_reconnect"
  /** Registratie afgerond. `{ method: 'password' | 'apple', has_invite: boolean }` */
  | "signup_completed"
  /** Onboardingstap getoond. `{ step: string }` (vaste stapnaam) */
  | "onboarding_step_viewed"
  /** Onboardingstap afgerond. `{ step: string, duration_ms?: number }` */
  | "onboarding_step_done"
  /** Bankkoppeling gestart. `{ reconnect: boolean }` */
  | "bank_connect_started"
  /**
   * Bankkoppeling mislukt. `{ reason: string }` (vaste foutcode, geen banktekst):
   * 'state' | 'geweigerd' | 'sessie' | 'opslaan' | 'niet_ingesteld' | 'start'.
   */
  | "bank_connect_failed"
  /** Begeleide eerste kaarten afgerond. `{ steps_seen: number }` */
  | "coach_completed"
  /** App geopend via een pushmelding. `{ tag?: string }` */
  | "push_opened"
  /** Keuze over pushmeldingen. `{ result: 'granted' | 'denied' | 'default', context: 'settings' | ... }` */
  | "push_permission"
  /**
   * Openstaand deel afgehandeld.
   * `{ how: 'repayment_tile' | 'manual_check' | 'person_all', age_days: number }`
   */
  | "share_settled"
  /**
   * Nieuw potje gemaakt.
   * `{ source: 'plus_tile' | 'editor' | 'onboarding', suggestion: 'studie' | 'huisdier' | 'kinderen' | null }`
   */
  | "potje_created"
  /** Potje gearchiveerd. `{}` */
  | "potje_archived"
  /** Maandbudget ingesteld of gewist. `{ cleared: boolean }` */
  | "budget_set"
  /** Spaardoel ingesteld of gewist. `{ cleared: boolean }` */
  | "goal_set"
  /** Notitie bij een transactie opgeslagen of gewist. `{ cleared: boolean }` */
  | "note_saved"
  /** Maand bekeken op het overzicht. `{ months_back: number }` (0 = deze maand) */
  | "month_viewed"
  /** Potje-detail geopend. `{}` (eventueel `{ from?: 'overzicht' | 'anders' }`) */
  | "category_detail_viewed"
  /** Zoeken gebruikt. `{ results_bucket: '0' | '1-5' | '6+' }` */
  | "search_used"
  /** Data gedownload als CSV. `{ rows_bucket: '0' | '1-100' | '101-1000' | '1000+' }` */
  | "export_downloaded"
  /**
   * Bank-sync mislukt. `{ reason: string }` (vaste foutcode, geen banktekst):
   * 'geen_koppeling' | 'ontkoppeld' | 'niet_bereikbaar' | 'verlopen' | 'sync'.
   */
  | "sync_failed";

export type OpenCardsBucket = "0" | "1-5" | "6-20" | "20+";

/** Aantal open kaartjes als bucket voor `app_open`, zodat er geen exacte aantallen in de meting staan. */
export function openCardsBucket(n: number): OpenCardsBucket {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n <= 5) return "1-5";
  if (n <= 20) return "6-20";
  return "20+";
}

/**
 * Logt een event voor de ingelogde gebruiker. Payload bevat alleen id's,
 * aantallen en duren: nooit bedragen, tegenpartijen of omschrijvingen.
 * Fouten worden genegeerd; een meting mag de app nooit breken.
 */
export async function logEvent(type: EventType, payload: Record<string, Json> = {}): Promise<void> {
  try {
    const user = await getUser();
    if (!user) return;
    const supabase = await createClient();
    await supabase.from("events").insert({ user_id: user.id, type, payload });
  } catch {
    // bewust stil
  }
}
