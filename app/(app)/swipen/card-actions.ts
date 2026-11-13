"use server";

import { requireUser } from "@/lib/auth";
import { ensureNietMeetellenCategory, ensureVerdeeldCategory } from "@/lib/categories/system";
import { logEvent } from "@/lib/events";
import { cardKind, parseCardChoices, settlementCoverage, type CardPayment } from "@/lib/native/wallet-card";
import { createClient } from "@/lib/supabase/server";
import { isCreditCardSettlement } from "@/lib/transactions/credit-card";

/**
 * Maandafrekening van de creditcard, voor wie zijn creditcardbetalingen al één voor één indeelt
 * via Apple Pay. Zonder dit zou de afrekening alles nog een keer tellen.
 *
 * De app doet niets uit zichzelf: het kaartje toont hoeveel al is ingedeeld, en pas na een tik
 * gaat dat deel naar "Telt niet mee". Blijft er een rest (aankopen zonder Apple Pay, kosten),
 * dan komt die als eigen kaartje terug op de stapel.
 */

const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const GENERIC = "Dat lukte niet. Probeer het nog eens.";

type CardCoverage =
  | { ok: true; coveredCents: number; restCents: number; count: number; until: string | null }
  | { ok: false };

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function loadSettlement(supabase: Supabase, userId: string, transactionId: string) {
  const { data: parent } = await supabase
    .from("transactions")
    .select("id, amount, source, category_id, booking_date, counterparty, description, raw_counterparty, raw_description")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!parent || parent.category_id !== null || parent.source !== "bank") return null;
  const amount = Number(parent.amount);
  const recognised = isCreditCardSettlement({
    amount,
    counterparty: parent.counterparty,
    description: parent.description,
    rawCounterparty: parent.raw_counterparty,
    rawDescription: parent.raw_description,
  });
  if (!recognised) return null;

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, booking_date, amount, wallet_card")
      .eq("user_id", userId)
      .eq("source", "applepay")
      .is("card_settlement_id", null)
      .lt("amount", 0)
      .lte("booking_date", parent.booking_date)
      .order("booking_date", { ascending: true })
      .limit(1000),
    supabase.from("profiles").select("wallet_cards").eq("id", userId).maybeSingle(),
  ]);
  const cards = parseCardChoices(profile?.wallet_cards);
  const payments: CardPayment[] = (rows ?? [])
    .filter((r) => cardKind(r.wallet_card, cards) === "credit")
    .map((r) => ({ id: r.id, booking_date: r.booking_date, amount: Number(r.amount) }));
  return { parent, amount, coverage: settlementCoverage(amount, payments) };
}

/** Hoeveel van deze creditcard-afrekening is al ingedeeld via Apple Pay? */
export async function cardCoverage(transactionId: string): Promise<CardCoverage> {
  const user = await requireUser();
  if (!isUuid(transactionId)) return { ok: false };
  const supabase = await createClient();
  const loaded = await loadSettlement(supabase, user.id, transactionId);
  if (!loaded || loaded.coverage.coveredCents === 0) return { ok: false };
  const { coveredCents, restCents, ids, until } = loaded.coverage;
  return { ok: true, coveredCents, restCents, count: ids.length, until };
}

type SettleCardResult = { ok: true; restId: string | null } | { ok: false; error: string };

/**
 * Haalt het deel dat al via Apple Pay is ingedeeld van de afrekening af.
 * - Dekt het alles: de afrekening gaat in "Telt niet mee".
 * - Blijft er een rest: de afrekening gaat in Verdeeld, met één deel in "Telt niet mee" en de rest
 *   als open kaartje (dat je daarna gewoon in een potje zet of verdeelt).
 * De betalingen krijgen een verwijzing naar deze afrekening, zodat ze volgende maand niet opnieuw
 * meetellen. Ongedaan maken (undoAssign) zet alles terug.
 */
export async function settleCardWithWallet(transactionId: string, expectedCoveredCents: number): Promise<SettleCardResult> {
  const user = await requireUser();
  if (!isUuid(transactionId)) return { ok: false, error: GENERIC };
  const supabase = await createClient();
  const loaded = await loadSettlement(supabase, user.id, transactionId);
  if (!loaded || loaded.coverage.coveredCents === 0) return { ok: false, error: "Dit kaartje is al ingedeeld." };
  const { parent, coverage } = loaded;
  // Wat de gebruiker op het kaartje zag, moet nog kloppen (er kan net een betaling bij zijn gekomen).
  if (coverage.coveredCents !== expectedCoveredCents) return { ok: false, error: "Het bedrag is net veranderd. Kijk nog even." };

  let nietMeetellenId: string;
  let verdeeldId: string;
  try {
    [nietMeetellenId, verdeeldId] = await Promise.all([
      ensureNietMeetellenCategory(supabase, user.id),
      ensureVerdeeldCategory(supabase, user.id),
    ]);
  } catch {
    return { ok: false, error: GENERIC };
  }
  const now = new Date().toISOString();
  const whole = coverage.restCents === 0;

  const { data: updated, error } = await supabase
    .from("transactions")
    .update({ category_id: whole ? nietMeetellenId : verdeeldId, categorized_at: now, own_share: null, awaiting_refund: false })
    .eq("id", parent.id)
    .eq("user_id", user.id)
    .is("category_id", null)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { ok: false, error: GENERIC };

  const revert = async () => {
    await supabase.from("transactions").delete().eq("split_parent_id", parent.id).eq("source", "split").eq("user_id", user.id);
    await supabase.from("transactions").update({ card_settlement_id: null }).eq("card_settlement_id", parent.id).eq("user_id", user.id);
    await supabase.from("transactions").update({ category_id: null, categorized_at: null }).eq("id", parent.id).eq("user_id", user.id);
  };

  let restId: string | null = null;
  if (!whole) {
    const part = (cents: number, categoryId: string | null, description: string) => ({
      user_id: user.id,
      account_id: null,
      source: "split" as const,
      amount: -cents / 100,
      booking_date: parent.booking_date,
      counterparty: parent.counterparty,
      description,
      category_id: categoryId,
      categorized_at: categoryId ? now : null,
      split_parent_id: parent.id,
      dedupe_hash: `split:${crypto.randomUUID()}`,
    });
    const { data: inserted, error: insertError } = await supabase
      .from("transactions")
      .insert([
        part(coverage.coveredCents, nietMeetellenId, "Al ingedeeld via Apple Pay"),
        part(coverage.restCents, null, "Rest van de afrekening"),
      ])
      .select("id, category_id");
    if (insertError || !inserted || inserted.length !== 2) {
      await revert();
      return { ok: false, error: GENERIC };
    }
    restId = inserted.find((r) => r.category_id === null)?.id ?? null;
  }

  const { error: markError } = await supabase
    .from("transactions")
    .update({ card_settlement_id: parent.id })
    .in("id", coverage.ids)
    .eq("user_id", user.id)
    .eq("source", "applepay");
  if (markError) {
    await revert();
    return { ok: false, error: GENERIC };
  }

  // Alleen aantallen en of er een rest was; nooit bedragen.
  await logEvent("swipe", {
    transaction_id: parent.id,
    category_id: whole ? nietMeetellenId : verdeeldId,
    flow: "card_settlement",
    parts: coverage.ids.length,
    complete: whole,
    coach: false,
    duration_ms: 0,
  });
  return { ok: true, restId };
}
