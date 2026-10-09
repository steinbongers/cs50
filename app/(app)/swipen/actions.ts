"use server";

import { requireUser } from "@/lib/auth";
import {
  ensureContantCategory,
  ensureGeldTerugCategory,
  ensureVerdeeldCategory,
  ensureVoorgeschotenCategory,
} from "@/lib/categories/system";
import {
  MAX_CATEGORIES,
  MAX_CATEGORY_NAME_LENGTH,
  isQuickSuggestionKey,
  type QuickSuggestionKey,
} from "@/lib/categories/defaults";
import { DEFAULT_CATEGORY_ICON, isCategoryIcon } from "@/lib/categories/icons";
import { isCategoryColor } from "@/lib/categories/palette";
import type { CategoryDraft } from "@/lib/categories/types";
import { logEvent } from "@/lib/events";
import { formatEuro, toISODate } from "@/lib/format";
import { amsterdamToday } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { applyRules } from "@/lib/transactions/apply-rules";
import { CASH_COUNTERPARTY, MAX_CASH_SPENDS, cashAmount, cashNote, isCashWithdrawal } from "@/lib/transactions/cash";
import { isCreditCardSettlement } from "@/lib/transactions/credit-card";
import { ruleKey } from "@/lib/transactions/rules";
import { MAX_SAME_COUNTERPARTY } from "@/lib/transactions/same-counterparty";
import { estimatedOwnShare, isValidEstimate, receivedPerExpense } from "@/lib/transactions/refunds";
import { MAX_SPLIT_PERSONS, MIN_SPLIT_PERSONS, splitEqually } from "@/lib/transactions/split";
import { checkSplitParts, type SplitPartInput } from "@/lib/transactions/split-parts";
import type { CategoryOption, OpenShare } from "@/lib/transactions/queries";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Na het kiezen van een potje: de nieuwe openstaande delen (alleen bij "via mijn rekening"). */
export type AssignResult = { ok: true; shares: OpenShare[] } | { ok: false; error: string };

const GENERIC_ERROR = "Opslaan lukte niet. Probeer het nog eens.";

export interface SplitInput {
  /** Totaal aantal personen, inclusief jijzelf. */
  persons: number;
  /** Hoe het geld terugkomt: via je rekening (blijft open) of anders (direct afgehandeld). */
  method: "bank" | "other";
  /** Optionele namen van de anderen, in volgorde. */
  names?: string[];
}

/**
 * "Ik krijg een deel terug" zonder verdelen: de hele uitgave gaat in het potje en wacht op
 * geld terug. Wat er binnenkomt gaat ervan af; is alles binnen, dan is de rest van jou.
 */
export interface TrackInput {
  track: true;
}

/** Extra context voor de meting: stond er een coachtip open bij deze kaart? */
export interface SwipeMeta {
  coach?: boolean;
}

function coachFlag(meta: unknown): boolean {
  return typeof meta === "object" && meta !== null && (meta as SwipeMeta).coach === true;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

function isTrack(value: unknown): value is TrackInput {
  return typeof value === "object" && value !== null && (value as Record<string, unknown>).track === true;
}

function isValidSplit(value: unknown): value is SplitInput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.persons === "number" &&
    Number.isInteger(v.persons) &&
    v.persons >= MIN_SPLIT_PERSONS &&
    v.persons <= MAX_SPLIT_PERSONS &&
    (v.method === "bank" || v.method === "other") &&
    (v.names === undefined || (Array.isArray(v.names) && v.names.every((n) => typeof n === "string")))
  );
}

/** De velden waaraan we een pinopname herkennen, uit een databaserij. */
function cashCandidate(t: {
  amount: number;
  counterparty: string | null;
  description: string | null;
  raw_counterparty: string | null;
  raw_description: string | null;
}) {
  return {
    amount: Number(t.amount),
    counterparty: t.counterparty,
    description: t.description,
    rawCounterparty: t.raw_counterparty,
    rawDescription: t.raw_description,
  };
}

/**
 * Zet een transactie in een potje. Dit is de kernhandeling van de app.
 * Met `split` gaat alleen jouw deel naar het potje; de delen van de anderen
 * komen in Voorgeschoten (open) of zijn direct afgehandeld (anders geregeld).
 * Met `{ track: true }` gaat de hele uitgave in het potje en wacht hij op geld terug.
 */
export async function assignCategory(
  transactionId: string,
  categoryId: string,
  durationMs: number,
  split?: SplitInput | TrackInput,
  meta?: SwipeMeta,
): Promise<AssignResult> {
  const user = await requireUser();
  if (!isUuid(transactionId) || !isUuid(categoryId)) return { ok: false, error: GENERIC_ERROR };
  if (split !== undefined && !isTrack(split) && !isValidSplit(split)) return { ok: false, error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id, system_key")
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .eq("archived", false)
    .maybeSingle();
  if (!category) return { ok: false, error: "Dit potje bestaat niet (meer)." };
  if (category.system_key) return { ok: false, error: "Dit potje kun je niet kiezen." };

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, amount, skipped_count, counterparty, booking_date")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!transaction) return { ok: false, error: GENERIC_ERROR };

  const amount = Number(transaction.amount);
  const useTrack = isTrack(split) && amount < 0;
  const useSplit = split !== undefined && !isTrack(split) && amount < 0;
  const result = useSplit ? splitEqually(amount, split.persons) : null;
  const ownShare = result ? result.ownShare : null;

  // Eerst de transactie zelf; de delen pas daarna. Zo blijven er nooit open
  // delen hangen aan een transactie die nog geen potje heeft.
  const { data: updated, error } = await supabase
    .from("transactions")
    .update({
      category_id: categoryId,
      categorized_at: new Date().toISOString(),
      own_share: ownShare,
      awaiting_refund: useTrack,
    })
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !updated) return { ok: false, error: GENERIC_ERROR };

  // Eventuele oude delen (na ongedaan maken) opruimen.
  await supabase.from("transaction_shares").delete().eq("transaction_id", transactionId).eq("user_id", user.id);

  let shares: OpenShare[] = [];
  if (result && split && !isTrack(split)) {
    const names = (split.names ?? []).map((n) => n.trim().slice(0, 60));
    const status = split.method === "bank" ? ("open" as const) : ("settled_elsewhere" as const);
    const { data: inserted, error: sharesError } = await supabase
      .from("transaction_shares")
      .insert(
        result.otherShares.map((shareAmount, index) => ({
          user_id: user.id,
          transaction_id: transactionId,
          person_name: names[index] || null,
          amount: shareAmount,
          status,
        })),
      )
      .select("id, person_name, amount, created_at");
    if (sharesError || !inserted) {
      // Terugdraaien: liever een kaart opnieuw op de stapel dan een halve verdeling.
      await supabase
        .from("transactions")
        .update({ category_id: null, categorized_at: null, own_share: null })
        .eq("id", transactionId)
        .eq("user_id", user.id);
      return { ok: false, error: GENERIC_ERROR };
    }
    if (status === "open") {
      shares = inserted.map((s) => ({
        id: s.id,
        transactionId,
        personName: s.person_name,
        amount: Number(s.amount),
        counterparty: transaction.counterparty?.trim() || "Onbekende tegenpartij",
        bookingDate: transaction.booking_date,
        createdAt: s.created_at,
      }));
    }
  }

  await logEvent("swipe", {
    transaction_id: transactionId,
    category_id: categoryId,
    duration_ms: Math.max(0, Math.round(Number.isFinite(durationMs) ? durationMs : 0)),
    skipped_before: transaction.skipped_count,
    split_persons: useSplit ? split.persons : null,
    split_method: useSplit ? split.method : useTrack ? "track" : null,
    coach: coachFlag(meta),
    flow: "normal",
  });

  return { ok: true, shares };
}

/**
 * Koppelt een inkomende transactie (Tikkie) aan openstaande delen.
 * De delen worden 'ontvangen'; de transactie gaat in Voorgeschoten, zodat
 * ze niet als inkomen telt.
 */
export async function settleSharesWithTransaction(
  transactionId: string,
  shareIds: string[],
  durationMs: number,
  meta?: SwipeMeta,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(transactionId) || !Array.isArray(shareIds) || shareIds.length === 0 || !shareIds.every(isUuid)) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, amount")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!transaction || Number(transaction.amount) <= 0) {
    return { ok: false, error: "Alleen inkomend geld kan een terugbetaling zijn." };
  }

  const { data: shares } = await supabase
    .from("transaction_shares")
    .select("id, created_at")
    .eq("user_id", user.id)
    .eq("status", "open")
    .in("id", shareIds);
  if (!shares || shares.length !== shareIds.length) {
    return { ok: false, error: "Een van de delen staat niet (meer) open." };
  }

  const voorgeschotenId = await ensureVoorgeschotenCategory(supabase, user.id);
  const now = new Date().toISOString();

  const { error: sharesError } = await supabase
    .from("transaction_shares")
    .update({ status: "received", received_transaction_id: transactionId, received_at: now })
    .eq("user_id", user.id)
    .in("id", shareIds);
  if (sharesError) return { ok: false, error: GENERIC_ERROR };

  const { error } = await supabase
    .from("transactions")
    .update({ category_id: voorgeschotenId, categorized_at: now, own_share: null })
    .eq("id", transactionId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: GENERIC_ERROR };

  await logEvent("swipe", {
    transaction_id: transactionId,
    category_id: voorgeschotenId,
    duration_ms: Math.max(0, Math.round(Number.isFinite(durationMs) ? durationMs : 0)),
    repayment_shares: shareIds.length,
    coach: coachFlag(meta),
    flow: "repayment",
  });

  // Per deel alleen hoe en hoe oud; nooit bedrag of naam.
  const nowMs = Date.parse(now);
  await Promise.all(
    shares.map((share) =>
      logEvent("share_settled", {
        how: "repayment_tile",
        age_days: Math.max(0, Math.floor((nowMs - Date.parse(share.created_at)) / DAY_MS)),
      }),
    ),
  );

  return { ok: true };
}

/**
 * Binnengekomen geld hoort bij een uitgave die op geld terug wacht. Het gaat in hetzelfde
 * potje als die uitgave (dus daar van af) en wijst ernaar. Met `complete` is alles binnen:
 * de uitgave wacht niet meer en de rest is van jou. Met `estimate` (alleen bij complete) kwam
 * een deel buiten de bank terug: dan telt het potje precies die schatting.
 */
export async function assignRefundFor(
  transactionId: string,
  expenseId: string,
  complete: boolean,
  durationMs: number,
  meta?: SwipeMeta,
  estimate: number | null = null,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(transactionId) || !isUuid(expenseId) || typeof complete !== "boolean") {
    return { ok: false, error: GENERIC_ERROR };
  }
  if (estimate !== null && !complete) return { ok: false, error: GENERIC_ERROR };

  const supabase = await createClient();
  const [{ data: transaction }, { data: expense }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, amount, category_id, skipped_count")
      .eq("id", transactionId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id, amount, category_id, awaiting_refund")
      .eq("id", expenseId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (!transaction || Number(transaction.amount) <= 0) {
    return { ok: false, error: "Alleen inkomend geld kan een terugbetaling zijn." };
  }
  if (transaction.category_id !== null) return { ok: false, error: "Dit kaartje zit al in een potje." };
  if (!expense || Number(expense.amount) >= 0 || !expense.awaiting_refund || !expense.category_id) {
    return { ok: false, error: "Deze uitgave wacht niet (meer) op geld terug." };
  }
  if (estimate !== null && !isValidEstimate(estimate, Number(expense.amount))) {
    return { ok: false, error: `Vul een bedrag in tussen € 0 en ${formatEuro(Math.abs(Number(expense.amount)))}.` };
  }

  const { data: category } = await supabase
    .from("categories")
    .select("id, system_key, is_income")
    .eq("id", expense.category_id)
    .eq("user_id", user.id)
    .eq("archived", false)
    .maybeSingle();
  if (!category || category.system_key || category.is_income) return { ok: false, error: "Dit potje bestaat niet (meer)." };

  const { data: updated, error } = await supabase
    .from("transactions")
    .update({
      category_id: category.id,
      categorized_at: new Date().toISOString(),
      own_share: null,
      refund_for_id: expense.id,
    })
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .is("category_id", null)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { ok: false, error: GENERIC_ERROR };

  if (complete) {
    // Met een schatting: alles wat via de bank terugkwam (ook deze) telt mee in own_share.
    let ownShare: number | null = null;
    if (estimate !== null) {
      const { data: refunds } = await supabase
        .from("transactions")
        .select("refund_for_id, amount")
        .eq("refund_for_id", expense.id)
        .eq("user_id", user.id);
      const received =
        receivedPerExpense((refunds ?? []).map((r) => ({ refundForId: r.refund_for_id, amount: Number(r.amount) }))).get(
          expense.id,
        ) ?? 0;
      ownShare = estimatedOwnShare(estimate, received);
    }
    const { error: closeError } = await supabase
      .from("transactions")
      .update({ awaiting_refund: false, own_share: ownShare })
      .eq("id", expense.id)
      .eq("user_id", user.id);
    if (closeError) {
      // Terugdraaien: liever het kaartje opnieuw op de stapel dan een halve afronding.
      await supabase
        .from("transactions")
        .update({ category_id: null, categorized_at: null, refund_for_id: null })
        .eq("id", transactionId)
        .eq("user_id", user.id);
      return { ok: false, error: GENERIC_ERROR };
    }
  }

  // Alleen of alles binnen is; nooit bedragen of de tegenpartij.
  await logEvent("swipe", {
    transaction_id: transactionId,
    category_id: category.id,
    duration_ms: Math.max(0, Math.round(Number.isFinite(durationMs) ? durationMs : 0)),
    skipped_before: transaction.skipped_count,
    coach: coachFlag(meta),
    flow: "refund_for",
    complete,
    estimate: estimate !== null,
  });
  return { ok: true };
}

export interface CashSpendInput {
  categoryId: string;
  /** Positief bedrag in euro's. */
  amount: number;
}

export type SplitCashResult = { ok: true; spendIds: string[] } | { ok: false; error: string };

/**
 * Pinopname: waar ging het contante geld heen? Elke uitgave wordt een eigen regel zonder rekening
 * (source 'cash') in het gekozen potje, gekoppeld aan de opname. De opname zelf gaat in het
 * ingebouwde potje Contant, zodat ze niet als uitgave telt; wat er over is blijft in je portemonnee.
 * Zonder uitgaven ("Nog niet uitgegeven") blijft het hele bedrag contant.
 */
export async function splitCash(
  transactionId: string,
  spends: CashSpendInput[],
  note: string | null,
  durationMs: number,
  meta?: SwipeMeta,
): Promise<SplitCashResult> {
  const user = await requireUser();
  if (!isUuid(transactionId) || !Array.isArray(spends) || spends.length > MAX_CASH_SPENDS) {
    return { ok: false, error: GENERIC_ERROR };
  }
  const parsed: { categoryId: string; amount: number }[] = [];
  for (const spend of spends) {
    const amount = cashAmount(spend?.amount);
    if (!isUuid(spend?.categoryId) || amount === null) return { ok: false, error: "Vul bedragen boven € 0 in." };
    parsed.push({ categoryId: spend.categoryId, amount });
  }
  const categoryIds = [...new Set(parsed.map((s) => s.categoryId))];
  if (categoryIds.length !== parsed.length) return { ok: false, error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, amount, source, category_id, skipped_count, counterparty, description, raw_counterparty, raw_description")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!transaction || transaction.source === "cash" || !isCashWithdrawal(cashCandidate(transaction))) {
    return { ok: false, error: "Dit is geen pinopname." };
  }
  if (transaction.category_id !== null) return { ok: false, error: "Dit kaartje zit al in een potje." };

  const withdrawn = Math.abs(Number(transaction.amount));
  const total = Math.round(parsed.reduce((sum, s) => sum + s.amount, 0) * 100) / 100;
  if (total > withdrawn) return { ok: false, error: "Dat is meer dan je hebt opgenomen." };

  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", user.id)
      .eq("archived", false)
      .eq("is_income", false)
      .is("system_key", null)
      .in("id", categoryIds);
    if ((categories ?? []).length !== categoryIds.length) return { ok: false, error: "Een van de potjes bestaat niet (meer)." };
  }

  let contantId: string;
  try {
    contantId = await ensureContantCategory(supabase, user.id);
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
  const now = new Date().toISOString();

  // Eerst de opname zelf (alleen als hij nog open is); de uitgaven pas daarna.
  const { data: updated, error } = await supabase
    .from("transactions")
    .update({ category_id: contantId, categorized_at: now, own_share: null })
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .is("category_id", null)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { ok: false, error: GENERIC_ERROR };
  await supabase.from("transaction_shares").delete().eq("transaction_id", transactionId).eq("user_id", user.id);

  let spendIds: string[] = [];
  if (parsed.length > 0) {
    const description = cashNote(note);
    const bookingDate = toISODate(amsterdamToday());
    const { data: inserted, error: insertError } = await supabase
      .from("transactions")
      .insert(
        parsed.map((s) => ({
          user_id: user.id,
          account_id: null,
          source: "cash" as const,
          amount: -s.amount,
          booking_date: bookingDate,
          counterparty: CASH_COUNTERPARTY,
          description,
          category_id: s.categoryId,
          categorized_at: now,
          cash_withdrawal_id: transactionId,
          dedupe_hash: `cash:${crypto.randomUUID()}`,
        })),
      )
      .select("id");
    if (insertError || !inserted) {
      // Terugdraaien: liever de opname opnieuw op de stapel dan een halve verdeling.
      await supabase
        .from("transactions")
        .update({ category_id: null, categorized_at: null })
        .eq("id", transactionId)
        .eq("user_id", user.id);
      return { ok: false, error: GENERIC_ERROR };
    }
    spendIds = inserted.map((t) => t.id);
  }

  await logEvent("swipe", {
    transaction_id: transactionId,
    category_id: contantId,
    duration_ms: Math.max(0, Math.round(Number.isFinite(durationMs) ? durationMs : 0)),
    skipped_before: transaction.skipped_count,
    coach: coachFlag(meta),
    flow: "cash",
  });
  // Alleen aantallen en of er iets overblijft; nooit bedragen of de notitie.
  await logEvent("cash_split", {
    spends: parsed.length,
    kept: parsed.length === 0 ? "all" : total < withdrawn ? "some" : "none",
  });

  return { ok: true, spendIds };
}

export type SplitTransactionResult = { ok: true; partIds: string[] } | { ok: false; error: string };

const SPLIT_ERRORS = {
  count: "Verdeel over minstens twee potjes.",
  amount: "Vul bedragen boven € 0 in.",
  duplicate: "Elk potje maar één keer.",
  sum: "De delen tellen niet op tot het hele bedrag.",
} as const;

/**
 * Eén afschrijving (vaak de creditcard) verdelen over meerdere potjes. Elk deel wordt een eigen
 * regel zonder rekening (source 'split') in het gekozen potje, met dezelfde datum en tegenpartij,
 * gekoppeld aan de afschrijving. De afschrijving zelf gaat in het ingebouwde potje Verdeeld, zodat
 * ze niet dubbel telt. De delen tellen in centen precies op tot het bedrag.
 */
export async function splitTransaction(
  parentId: string,
  parts: SplitPartInput[],
  durationMs: number,
  meta?: SwipeMeta,
): Promise<SplitTransactionResult> {
  const user = await requireUser();
  if (!isUuid(parentId) || !Array.isArray(parts) || !parts.every((p) => isUuid(p?.categoryId))) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { data: parent } = await supabase
    .from("transactions")
    .select(
      "id, amount, source, category_id, skipped_count, booking_date, counterparty, description, raw_counterparty, raw_description",
    )
    .eq("id", parentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!parent) return { ok: false, error: GENERIC_ERROR };
  if (parent.category_id !== null) return { ok: false, error: "Dit kaartje zit al in een potje." };
  // Een pinopname verdeel je via Contant; contante uitgaven en delen verdeel je niet nog eens.
  if (parent.source === "cash" || parent.source === "split" || isCashWithdrawal(cashCandidate(parent))) {
    return { ok: false, error: "Dit kaartje kun je zo niet verdelen." };
  }

  const amount = Number(parent.amount);
  const check = checkSplitParts(amount, parts);
  if (!check.ok) return { ok: false, error: SPLIT_ERRORS[check.reason] };

  const categoryIds = check.parts.map((p) => p.categoryId);
  const { data: categories } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("archived", false)
    .eq("is_income", false)
    .is("system_key", null)
    .in("id", categoryIds);
  if ((categories ?? []).length !== categoryIds.length) return { ok: false, error: "Een van de potjes bestaat niet (meer)." };

  let verdeeldId: string;
  try {
    verdeeldId = await ensureVerdeeldCategory(supabase, user.id);
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
  const now = new Date().toISOString();

  // Eerst de afschrijving zelf (alleen als hij nog open is); de delen pas daarna.
  const { data: updated, error } = await supabase
    .from("transactions")
    .update({ category_id: verdeeldId, categorized_at: now, own_share: null, awaiting_refund: false })
    .eq("id", parentId)
    .eq("user_id", user.id)
    .is("category_id", null)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { ok: false, error: GENERIC_ERROR };
  await supabase.from("transaction_shares").delete().eq("transaction_id", parentId).eq("user_id", user.id);

  // Elk deel krijgt het teken van de afschrijving: een uitgave blijft een uitgave.
  const sign = amount < 0 ? -1 : 1;
  const { data: inserted, error: insertError } = await supabase
    .from("transactions")
    .insert(
      check.parts.map((p) => ({
        user_id: user.id,
        account_id: null,
        source: "split" as const,
        amount: (sign * p.cents) / 100,
        booking_date: parent.booking_date,
        counterparty: parent.counterparty,
        description: p.note,
        category_id: p.categoryId,
        categorized_at: now,
        split_parent_id: parentId,
        dedupe_hash: `split:${crypto.randomUUID()}`,
      })),
    )
    .select("id");
  if (insertError || !inserted) {
    // Terugdraaien: liever de afschrijving opnieuw op de stapel dan een halve verdeling.
    await supabase
      .from("transactions")
      .update({ category_id: null, categorized_at: null })
      .eq("id", parentId)
      .eq("user_id", user.id);
    return { ok: false, error: GENERIC_ERROR };
  }

  // Alleen het aantal potjes en of het een herkende creditcard was; nooit bedragen of notities.
  await logEvent("swipe", {
    transaction_id: parentId,
    category_id: verdeeldId,
    duration_ms: Math.max(0, Math.round(Number.isFinite(durationMs) ? durationMs : 0)),
    skipped_before: parent.skipped_count,
    coach: coachFlag(meta),
    flow: "split_parts",
    parts: check.parts.length,
    credit_card: isCreditCardSettlement(cashCandidate(parent)),
  });

  return { ok: true, partIds: inserted.map((t) => t.id) };
}

/** Maakt de laatste keuze ongedaan: de transactie gaat terug naar de stapel. */
export async function undoAssign(transactionId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(transactionId)) return { ok: false, error: GENERIC_ERROR };

  const supabase = await createClient();

  // Was dit een terugbetaling voor een uitgave? Dan wacht die uitgave straks weer.
  const { data: before } = await supabase
    .from("transactions")
    .select("refund_for_id")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Delen die bij deze uitgave hoorden weg; delen die deze Tikkie afbetaalde weer open.
  await supabase.from("transaction_shares").delete().eq("transaction_id", transactionId).eq("user_id", user.id);
  // Contante uitgaven die net uit deze pinopname zijn verdeeld, weer weg.
  const { error: cashError } = await supabase
    .from("transactions")
    .delete()
    .eq("cash_withdrawal_id", transactionId)
    .eq("source", "cash")
    .eq("user_id", user.id);
  if (cashError) return { ok: false, error: "Ongedaan maken lukte niet." };
  // Zo ook de delen die net uit deze afschrijving zijn verdeeld.
  const { error: splitError } = await supabase
    .from("transactions")
    .delete()
    .eq("split_parent_id", transactionId)
    .eq("source", "split")
    .eq("user_id", user.id);
  if (splitError) return { ok: false, error: "Ongedaan maken lukte niet." };
  await supabase
    .from("transaction_shares")
    .update({ status: "open", received_transaction_id: null, received_at: null })
    .eq("received_transaction_id", transactionId)
    .eq("user_id", user.id);

  const { data: updated, error } = await supabase
    .from("transactions")
    .update({ category_id: null, categorized_at: null, own_share: null, awaiting_refund: false, refund_for_id: null })
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !updated) return { ok: false, error: "Ongedaan maken lukte niet." };

  if (before?.refund_for_id) {
    // De uitgave wacht weer; een eventuele schatting van daarnet vervalt.
    await supabase
      .from("transactions")
      .update({ awaiting_refund: true, own_share: null })
      .eq("id", before.refund_for_id)
      .eq("user_id", user.id);
  }

  await logEvent("undo", { transaction_id: transactionId });
  return { ok: true };
}

/**
 * Inkomend geld dat je terugkreeg (retour, refund, iemand betaalt iets terug).
 * Met een uitgavepotje: daar gaat het van af. Zonder potje (null): in Geld terug,
 * dan gaat het alleen van je totaal af. Inkomen telt het nooit.
 */
export async function assignRefund(
  transactionId: string,
  categoryId: string | null,
  durationMs: number,
  meta?: SwipeMeta,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(transactionId) || (categoryId !== null && !isUuid(categoryId))) return { ok: false, error: GENERIC_ERROR };

  const supabase = await createClient();
  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, amount")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!transaction || Number(transaction.amount) <= 0) return { ok: false, error: GENERIC_ERROR };

  let targetId: string;
  if (categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("id, system_key, is_income")
      .eq("id", categoryId)
      .eq("user_id", user.id)
      .eq("archived", false)
      .maybeSingle();
    if (!category) return { ok: false, error: "Dit potje bestaat niet (meer)." };
    if (category.system_key || category.is_income) return { ok: false, error: "Kies een potje voor uitgaven." };
    targetId = category.id;
  } else {
    try {
      targetId = await ensureGeldTerugCategory(supabase, user.id);
    } catch {
      return { ok: false, error: GENERIC_ERROR };
    }
  }

  const { data: updated, error } = await supabase
    .from("transactions")
    .update({ category_id: targetId, categorized_at: new Date().toISOString(), own_share: null })
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { ok: false, error: GENERIC_ERROR };

  await logEvent("swipe", {
    transaction_id: transactionId,
    category_id: targetId,
    duration_ms: Math.max(0, Math.round(Number.isFinite(durationMs) ? durationMs : 0)),
    coach: coachFlag(meta),
    flow: "refund",
    with_category: categoryId !== null,
  });
  return { ok: true };
}

export type AssignAlwaysResult =
  | { ok: true; ruleId: string; ids: string[]; replaced: boolean }
  | { ok: false; error: string };

/**
 * Potje ingedrukt gehouden: deze ontvanger gaat voortaan altijd in dit potje.
 * Zet dit kaartje erin, legt de regel vast en deelt de andere open kaartjes van
 * dezelfde ontvanger (zelfde richting) meteen mee in. Nieuwe kaartjes volgen bij de bank-sync.
 */
export async function assignAlways(
  transactionId: string,
  categoryId: string,
  durationMs: number,
  meta?: SwipeMeta,
): Promise<AssignAlwaysResult> {
  const user = await requireUser();
  if (!isUuid(transactionId) || !isUuid(categoryId)) return { ok: false, error: GENERIC_ERROR };

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id, system_key")
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .eq("archived", false)
    .maybeSingle();
  if (!category) return { ok: false, error: "Dit potje bestaat niet (meer)." };
  if (category.system_key) return { ok: false, error: "Dit potje kun je niet kiezen." };

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, amount, counterparty, description, raw_counterparty, raw_description")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!transaction) return { ok: false, error: GENERIC_ERROR };
  if (isCashWithdrawal(cashCandidate(transaction))) {
    return { ok: false, error: "Een geldautomaat wordt geen vaste ontvanger. Kies het potje met een tik." };
  }
  const match = ruleKey(transaction.counterparty, Number(transaction.amount));
  if (!match) return { ok: false, error: "Deze ontvanger kunnen we niet herkennen. Kies het potje gewoon met een tik." };

  const { data: existing } = await supabase
    .from("category_rules")
    .select("id")
    .eq("user_id", user.id)
    .eq("counterparty_match", match)
    .maybeSingle();
  const { data: rule, error: ruleError } = await supabase
    .from("category_rules")
    .upsert({ user_id: user.id, counterparty_match: match, category_id: categoryId }, { onConflict: "user_id,counterparty_match" })
    .select("id")
    .single();
  if (ruleError || !rule) return { ok: false, error: GENERIC_ERROR };

  const { error } = await supabase
    .from("transactions")
    .update({ category_id: categoryId, categorized_at: new Date().toISOString(), own_share: null })
    .eq("id", transactionId)
    .eq("user_id", user.id);
  if (error) {
    if (!existing) await supabase.from("category_rules").delete().eq("id", rule.id).eq("user_id", user.id);
    return { ok: false, error: GENERIC_ERROR };
  }
  await supabase.from("transaction_shares").delete().eq("transaction_id", transactionId).eq("user_id", user.id);

  let ids: string[] = [];
  try {
    ids = await applyRules(supabase, user.id, { onlyMatch: match });
  } catch {
    // de regel staat; de rest volgt bij de volgende sync
  }

  await logEvent("swipe", {
    transaction_id: transactionId,
    category_id: categoryId,
    duration_ms: Math.max(0, Math.round(Number.isFinite(durationMs) ? durationMs : 0)),
    coach: coachFlag(meta),
    flow: "rule",
  });
  await logEvent("rule_created", { category_id: categoryId, applied: ids.length, replaced: Boolean(existing) });
  return { ok: true, ruleId: rule.id, ids, replaced: Boolean(existing) };
}

/**
 * Vaste ontvanger weer weg. Met `revertIds` gaan die kaartjes terug op de stapel
 * (ongedaan maken direct na het instellen); zonder blijft alles wat al ingedeeld is staan.
 */
export async function removeRule(ruleId: string, revertIds: string[] = []): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(ruleId) || !Array.isArray(revertIds) || !revertIds.every(isUuid)) return { ok: false, error: GENERIC_ERROR };
  const supabase = await createClient();
  const { error } = await supabase.from("category_rules").delete().eq("id", ruleId).eq("user_id", user.id);
  if (error) return { ok: false, error: "Weghalen lukte niet. Probeer het nog eens." };
  if (revertIds.length > 0) {
    await supabase
      .from("transactions")
      .update({ category_id: null, categorized_at: null, own_share: null })
      .in("id", revertIds)
      .eq("user_id", user.id);
  }
  await logEvent("rule_removed", { reverted: revertIds.length });
  return { ok: true };
}

export type AssignManyResult = { ok: true; ids: string[] } | { ok: false; error: string };

/**
 * "Ook de andere van deze winkel": zet meerdere open kaartjes in één keer in hetzelfde potje.
 * Alleen kaartjes zonder potje; het hele bedrag, nooit een verdeling.
 */
export async function assignMany(transactionIds: string[], categoryId: string): Promise<AssignManyResult> {
  const user = await requireUser();
  if (
    !Array.isArray(transactionIds) ||
    transactionIds.length === 0 ||
    transactionIds.length > MAX_SAME_COUNTERPARTY ||
    !transactionIds.every(isUuid) ||
    !isUuid(categoryId)
  ) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id, system_key")
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .eq("archived", false)
    .maybeSingle();
  if (!category) return { ok: false, error: "Dit potje bestaat niet (meer)." };
  if (category.system_key) return { ok: false, error: "Dit potje kun je niet kiezen." };

  const { data: updated, error } = await supabase
    .from("transactions")
    .update({ category_id: categoryId, categorized_at: new Date().toISOString(), own_share: null })
    .in("id", transactionIds)
    .eq("user_id", user.id)
    .is("category_id", null)
    .select("id");
  if (error || !updated) return { ok: false, error: GENERIC_ERROR };

  await logEvent("bulk_assign", { category_id: categoryId, count: updated.length });
  return { ok: true, ids: updated.map((t) => t.id) };
}

/** Maakt "ook de andere" ongedaan: de kaartjes gaan terug op de stapel. */
export async function undoMany(transactionIds: string[]): Promise<ActionResult> {
  const user = await requireUser();
  if (!Array.isArray(transactionIds) || transactionIds.length === 0 || !transactionIds.every(isUuid)) {
    return { ok: false, error: GENERIC_ERROR };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .update({ category_id: null, categorized_at: null, own_share: null })
    .in("id", transactionIds)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Ongedaan maken lukte niet." };

  await logEvent("bulk_undo", { count: transactionIds.length });
  return { ok: true };
}

/** Legt een kaart achteraan de stapel. */
export async function skipTransaction(transactionId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(transactionId)) return { ok: false, error: GENERIC_ERROR };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("transactions")
    .select("skipped_count")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!current) return { ok: false, error: GENERIC_ERROR };

  const { error } = await supabase
    .from("transactions")
    .update({ skipped_count: current.skipped_count + 1 })
    .eq("id", transactionId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: GENERIC_ERROR };

  await logEvent("skip", { transaction_id: transactionId, skipped_count: current.skipped_count + 1 });
  return { ok: true };
}

/** Nieuw potje vanaf het hoofdscherm. Geeft het potje terug als tegel. */
export async function createCategory(
  draft: Omit<CategoryDraft, "id" | "enabled">,
  suggestion: QuickSuggestionKey | null = null,
): Promise<{ ok: true; category: CategoryOption } | { ok: false; error: string }> {
  const user = await requireUser();

  const name = typeof draft.name === "string" ? draft.name.trim().slice(0, MAX_CATEGORY_NAME_LENGTH) : "";
  if (!name) return { ok: false, error: "Geef het potje een naam." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("archived", false)
    .is("system_key", null);
  if ((count ?? 0) >= MAX_CATEGORIES) return { ok: false, error: `Je hebt al ${MAX_CATEGORIES} potjes.` };

  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("user_id", user.id)
    .is("system_key", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      name,
      icon: isCategoryIcon(draft.icon) ? draft.icon : DEFAULT_CATEGORY_ICON,
      color: isCategoryColor(draft.color) ? draft.color : "grijs",
      is_income: Boolean(draft.isIncome),
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("id, name, icon, color, is_income, system_key")
    .single();

  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  // Alleen de bron en de gekozen suggestie; nooit de naam.
  await logEvent("potje_created", {
    source: "plus_tile",
    suggestion: isQuickSuggestionKey(suggestion) ? suggestion : null,
  });

  return {
    ok: true,
    category: {
      id: data.id,
      name: data.name,
      icon: data.icon,
      color: data.color,
      isIncome: data.is_income,
      systemKey: data.system_key,
      spentThisPeriod: 0,
      monthlyBudget: null,
      goalAmount: null,
    },
  };
}

/** Bewaart hoe ver de gebruiker is met de begeleide eerste kaarten. */
export async function setCoachStep(step: number): Promise<void> {
  const user = await requireUser();
  const value = Math.min(Math.max(Math.round(step), 0), 9);
  const supabase = await createClient();
  await supabase.from("profiles").update({ coach_step: value }).eq("id", user.id);
}

/** Begeleide eerste kaarten afgerond: stand opslaan en één keer meten. */
export async function completeCoach(stepsSeen: number): Promise<void> {
  const user = await requireUser();
  const steps = Math.min(Math.max(Math.round(Number(stepsSeen) || 0), 0), 9);
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("coach_step").eq("id", user.id).maybeSingle();
  await supabase.from("profiles").update({ coach_step: Math.max(steps, profile?.coach_step ?? 0) }).eq("id", user.id);
  // Alleen meten als de coach nog niet eerder als afgerond stond.
  if ((profile?.coach_step ?? 0) < steps) await logEvent("coach_completed", { steps_seen: steps });
}

/** Registreert het einde van een ronde (alle geladen kaarten verwerkt). */
export async function completeSession(summary: {
  assigned: number;
  skipped: number;
  undone: number;
  durationMs: number;
}): Promise<void> {
  await requireUser();
  await logEvent("swipe_session_complete", {
    assigned: Math.max(0, Math.round(summary.assigned)),
    skipped: Math.max(0, Math.round(summary.skipped)),
    undone: Math.max(0, Math.round(summary.undone)),
    duration_ms: Math.max(0, Math.round(summary.durationMs)),
  });
}
