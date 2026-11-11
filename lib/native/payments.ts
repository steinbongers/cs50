import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toISODate } from "@/lib/format";
import { amsterdamToday } from "@/lib/periods";
import { createApnsSender, forgetApnsToken, pushDevicesFor, isApnsConfigured, type ApnsSender } from "@/lib/push/apns";
import { apnsPayload } from "@/lib/push/apns-jwt";
import {
  MAX_SINGLE_NOTIFICATIONS,
  PAYMENT_CATEGORY,
  PAYMENT_CATEGORY_NO_SUGGESTION,
  isQuietHour,
  manyPaymentsMessage,
  paymentMessage,
  showDetails,
} from "@/lib/push/payment-copy";
import type { Database, Json, NativeDeviceRow, PreviewSetting } from "@/lib/supabase/types";
import { applyRules } from "@/lib/transactions/apply-rules";
import { actionSecretFromEnv, createActionToken } from "./action-token";
import { cardKind, parseCardChoices, type CardChoices } from "./wallet-card";
import { SUGGEST_HISTORY_DAYS, merchantKey, pickSuggestion, topCategories, type HistoryRow } from "./suggest";
import { MATCH_DAYS_AFTER, MATCH_DAYS_BEFORE, matchWalletPayments, type BankSide, type WalletSide } from "./wallet-match";

/**
 * Betalingen die buiten de app om worden ingedeeld: Apple Pay via Opdrachten, de melding met
 * knoppen na een bank-sync, en de knoppen op de grote widget.
 *
 * Werkt met de service-role-client (geen inlogsessie): filter daarom ALTIJD op user_id.
 * Logt nooit bedragen, winkels of potjesnamen; events bevatten alleen id's en soorten.
 */

type Admin = SupabaseClient<Database>;
const DAY_MS = 864e5;

export async function logEventFor(admin: Admin, userId: string, type: string, payload: Record<string, Json>): Promise<void> {
  try {
    await admin.from("events").insert({ user_id: userId, type, payload });
  } catch {
    // bewust stil
  }
}

// --- Potjes en voorstel ---------------------------------------------------------

interface CategoryInfo {
  id: string;
  name: string;
  color: string;
  is_income: boolean;
}

/** Potjes die je nu kunt kiezen (geen systeempotje, niet gearchiveerd), in eigen volgorde. */
async function choosableCategories(admin: Admin, userId: string): Promise<CategoryInfo[]> {
  const { data } = await admin
    .from("categories")
    .select("id, name, color, is_income")
    .eq("user_id", userId)
    .eq("archived", false)
    .is("system_key", null)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

async function recentChoices(admin: Admin, userId: string): Promise<HistoryRow[]> {
  const since = new Date(Date.now() - SUGGEST_HISTORY_DAYS * DAY_MS).toISOString();
  const { data } = await admin
    .from("transactions")
    .select("category_id, counterparty, wallet_merchant, categorized_at")
    .eq("user_id", userId)
    .not("category_id", "is", null)
    .gte("categorized_at", since)
    .order("categorized_at", { ascending: false })
    .limit(1000);
  return (data ?? []).filter((r): r is HistoryRow => typeof r.category_id === "string");
}

export async function suggestCategory(admin: Admin, userId: string, merchant: string | null): Promise<CategoryInfo | null> {
  if (!merchantKey(merchant)) return null;
  const [categories, history] = await Promise.all([choosableCategories(admin, userId), recentChoices(admin, userId)]);
  const spend = categories.filter((c) => !c.is_income);
  const id = pickSuggestion(history, merchant, new Set(spend.map((c) => c.id)));
  return spend.find((c) => c.id === id) ?? null;
}

// --- Melding ----------------------------------------------------------------------

interface ProfileFlags {
  lock_screen_details: boolean;
  payment_notifications: boolean;
  cards: CardChoices;
}

async function profileFlags(admin: Admin, userId: string): Promise<ProfileFlags> {
  const { data } = await admin
    .from("profiles")
    .select("lock_screen_details, payment_notifications, wallet_cards")
    .eq("id", userId)
    .maybeSingle();
  return {
    lock_screen_details: data?.lock_screen_details ?? false,
    payment_notifications: data?.payment_notifications ?? true,
    cards: parseCardChoices(data?.wallet_cards),
  };
}

/** Wat de iPhone nodig heeft om een melding met knoppen te tonen (ook voor de lokale Apple Pay-melding). */
export interface PaymentPrompt {
  transactionId: string;
  title: string;
  body: string;
  /** Knoppenset op de iPhone: met "Klopt" of alleen kiezen. */
  category: typeof PAYMENT_CATEGORY | typeof PAYMENT_CATEGORY_NO_SUGGESTION;
  categoryId: string | null;
  /** Actiesleutel voor "Klopt" (48 uur geldig). Null zonder voorstel. */
  action: string | null;
}

export function buildPrompt(input: {
  userId: string;
  transactionId: string;
  merchant: string | null;
  amount: number;
  suggestion: CategoryInfo | null;
  /** Bedrag, winkel en potje in de tekst zetten? Zie `showDetails` in lib/push/payment-copy.ts. */
  details: boolean;
}): PaymentPrompt {
  const secret = actionSecretFromEnv();
  const suggestion = secret ? input.suggestion : null;
  const text = paymentMessage({
    merchant: input.merchant,
    amount: input.amount,
    categoryName: suggestion?.name ?? null,
    details: input.details,
  });
  return {
    transactionId: input.transactionId,
    ...text,
    category: suggestion ? PAYMENT_CATEGORY : PAYMENT_CATEGORY_NO_SUGGESTION,
    categoryId: suggestion?.id ?? null,
    action:
      suggestion && secret
        ? createActionToken({ userId: input.userId, transactionId: input.transactionId, categoryId: suggestion.id }, secret)
        : null,
  };
}

/** Markeert betalingen als gemeld; geeft de id's terug die nog niet gemeld waren (dus nu wel melden). */
async function claimNotification(admin: Admin, userId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const { data } = await admin
    .from("transactions")
    .update({ notified_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("id", ids)
    .is("notified_at", null)
    .select("id");
  return (data ?? []).map((r) => r.id);
}

async function sendToDevices(admin: Admin, sender: ApnsSender, devices: NativeDeviceRow[], build: (d: NativeDeviceRow) => string, collapseId?: string): Promise<number> {
  let sent = 0;
  for (const device of devices) {
    const outcome = await sender.send(device, build(device), collapseId);
    if (outcome === "sent") sent++;
    if (outcome === "gone") await forgetApnsToken(admin, device.id);
  }
  return sent;
}

/**
 * Na een bank-sync: één melding met knoppen per nieuwe, nog open uitgave. Bij meer dan
 * MAX_SINGLE_NOTIFICATIONS één samenvatting zonder knoppen. Niet 's nachts; dan blijven ze
 * ongemeld en komen ze op de stapel en in de avondmelding.
 */
export async function notifyNewPayments(admin: Admin, userId: string, ids: string[], sender: ApnsSender): Promise<number> {
  if (ids.length === 0 || !isApnsConfigured() || isQuietHour()) return 0;
  const flags = await profileFlags(admin, userId);
  if (!flags.payment_notifications) return 0;
  const devices = await pushDevicesFor(admin, userId);
  if (devices.length === 0) return 0;

  const { data: rows } = await admin
    .from("transactions")
    .select("id, amount, counterparty, wallet_merchant, booking_date")
    .eq("user_id", userId)
    .in("id", ids)
    .is("category_id", null)
    .is("notified_at", null)
    .eq("is_internal_transfer", false)
    .lt("amount", 0);
  // Alleen recente betalingen: een eerste import van een maand terug is geen "net betaald".
  const recentFrom = toISODate(new Date(amsterdamToday().getTime() - 3 * DAY_MS));
  const fresh = (rows ?? []).filter((r) => r.booking_date >= recentFrom);
  if (fresh.length === 0) return 0;

  const claimed = await claimNotification(admin, userId, fresh.map((r) => r.id));
  if (claimed.length === 0) return 0;

  if (claimed.length > MAX_SINGLE_NOTIFICATIONS) {
    const text = manyPaymentsMessage(claimed.length);
    const sent = await sendToDevices(admin, sender, devices, () => apnsPayload({ ...text, threadId: "betalingen", data: { url: "/swipen?ref=push&tag=betalingen" } }));
    if (sent > 0) await logEventFor(admin, userId, "push_sent", { tag: "betalingen", count: claimed.length });
    return sent > 0 ? 1 : 0;
  }

  let notified = 0;
  for (const row of fresh.filter((r) => claimed.includes(r.id))) {
    const merchant = row.wallet_merchant ?? row.counterparty;
    const suggestion = await suggestCategory(admin, userId, merchant);
    // De server weet niet zeker hoe "Voorvertoning tonen" nu op de iPhone staat (dat kan veranderd
    // zijn sinds de app voor het laatst open was). Daarom: de zichtbare tekst is zonder details,
    // tenzij de gebruiker ze zelf op het vergrendelscherm wil. De tekst mét details gaat apart mee
    // (`detail`); de iPhone zet die er zelf in (NotificationService.swift), en alleen als iOS de
    // voorvertoning op dat moment verbergt tot het toestel ontgrendeld is.
    const base = { userId, transactionId: row.id, merchant, amount: Number(row.amount), suggestion };
    const full = buildPrompt({ ...base, details: true });
    const shown = flags.lock_screen_details ? full : buildPrompt({ ...base, details: false });
    const body = apnsPayload({
      title: shown.title,
      body: shown.body,
      category: full.category,
      threadId: "betalingen",
      mutableContent: !flags.lock_screen_details,
      data: {
        tx: row.id,
        ...(full.action ? { action: full.action } : {}),
        url: `/swipen?tx=${row.id}&ref=push&tag=betaling`,
        ...(flags.lock_screen_details ? {} : { detailTitle: full.title, detailBody: full.body }),
      },
    });
    const sent = await sendToDevices(admin, sender, devices, () => body, row.id);
    if (sent > 0) {
      notified++;
      await logEventFor(admin, userId, "push_sent", { tag: "betaling", transaction_id: row.id, suggested: Boolean(suggestion) });
    }
  }
  return notified;
}

// --- Ontdubbelen Apple Pay tegen bank ------------------------------------------------

/**
 * Na het ophalen: zoekt voor de nieuwe bankregels een open Apple Pay-regel van dezelfde betaling.
 * De bankregel blijft (die is echt en hoort bij een rekening) en neemt potje, notitie en de
 * Wallet-winkelnaam over; de Apple Pay-regel verdwijnt. De bankregel telt dan als gemeld.
 * Werkt met een gebruikersclient (handmatig verversen) en de service-role-client (cron).
 */
export async function mergeWalletPayments(supabase: Admin, userId: string, bankIds: string[]): Promise<string[]> {
  if (bankIds.length === 0) return [];
  const bank: (BankSide & { category_id: string | null })[] = [];
  for (let i = 0; i < bankIds.length; i += 200) {
    const { data } = await supabase
      .from("transactions")
      .select("id, booking_date, amount, counterparty, raw_counterparty, category_id")
      .eq("user_id", userId)
      .eq("source", "bank")
      .lt("amount", 0)
      .in("id", bankIds.slice(i, i + 200));
    bank.push(...(data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })));
  }
  if (bank.length === 0) return [];

  const dates = bank.map((b) => b.booking_date).sort();
  const from = toISODate(new Date(Date.parse(dates[0]) - MATCH_DAYS_AFTER * DAY_MS));
  const to = toISODate(new Date(Date.parse(dates[dates.length - 1]) + MATCH_DAYS_BEFORE * DAY_MS));
  const WALLET_COLUMNS =
    "id, booking_date, amount, wallet_merchant, wallet_card, counterparty, category_id, categorized_at, note, awaiting_refund, own_share, notified_at";
  const [{ data: walletRows }, { data: profile }] = await Promise.all([
    supabase
      .from("transactions")
      .select(WALLET_COLUMNS)
      .eq("user_id", userId)
      .eq("source", "applepay")
      .gte("booking_date", from)
      .lte("booking_date", to),
    supabase.from("profiles").select("wallet_cards").eq("id", userId).maybeSingle(),
  ]);
  const cards = parseCardChoices(profile?.wallet_cards);
  // Een creditcardbetaling komt nooit als losse bankregel: die mag niet samengaan met een
  // toevallig even grote betaling van de betaalrekening.
  const wallet = (walletRows ?? []).filter((w) => cardKind(w.wallet_card, cards) !== "credit");
  if (wallet.length === 0) return [];

  const walletSides: WalletSide[] = wallet.map((w) => ({
    id: w.id,
    booking_date: w.booking_date,
    amount: Number(w.amount),
    merchant: w.wallet_merchant ?? w.counterparty,
  }));
  const matches = matchWalletPayments(bank, walletSides);
  const merged: string[] = [];
  for (const m of matches) {
    const b = bank.find((x) => x.id === m.bankId)!;
    // Vers lezen: tussen het zoeken en nu kan de gebruiker de Apple Pay-regel hebben ingedeeld.
    const { data: w, error: readError } = await supabase
      .from("transactions")
      .select(WALLET_COLUMNS)
      .eq("id", m.walletId)
      .eq("user_id", userId)
      .eq("source", "applepay")
      .maybeSingle();
    if (readError || !w) continue;
    // Een keuze van de gebruiker (op de Apple Pay-regel) gaat voor een vaste ontvanger op de bankregel.
    const carry = w.category_id
      ? { category_id: w.category_id, categorized_at: w.categorized_at, own_share: w.own_share, awaiting_refund: w.awaiting_refund }
      : {};
    const { error } = await supabase
      .from("transactions")
      .update({
        ...carry,
        ...(w.note ? { note: w.note } : {}),
        wallet_merchant: w.wallet_merchant,
        wallet_card: w.wallet_card,
        notified_at: w.notified_at ?? new Date().toISOString(),
      })
      .eq("id", b.id)
      .eq("user_id", userId);
    if (error) continue;
    // Verwijzingen naar de Apple Pay-regel overzetten vóór we hem weghalen. Lukt er één niet, dan
    // blijft de Apple Pay-regel staan: delen van een verdeling hangen eraan met "on delete cascade".
    const moves = await Promise.all([
      supabase.from("transaction_shares").update({ transaction_id: b.id }).eq("transaction_id", w.id).eq("user_id", userId),
      supabase.from("transactions").update({ refund_for_id: b.id }).eq("refund_for_id", w.id).eq("user_id", userId),
      supabase.from("transactions").update({ split_parent_id: b.id }).eq("split_parent_id", w.id).eq("user_id", userId),
    ]);
    if (moves.some((r) => r.error)) continue;
    // Alleen weghalen als het potje nog is wat we net overnamen; anders de volgende ronde opnieuw.
    let remove = supabase.from("transactions").delete().eq("id", w.id).eq("user_id", userId).eq("source", "applepay");
    remove = w.category_id ? remove.eq("category_id", w.category_id) : remove.is("category_id", null);
    const { data: removed, error: removeError } = await remove.select("id");
    if (removeError || !removed || removed.length === 0) continue;
    merged.push(b.id);
  }
  return merged;
}

// --- Apple Pay binnen via Opdrachten -----------------------------------------------------

export type WalletIntakeResult =
  | { status: "prompt"; prompt: PaymentPrompt }
  /** Al in een potje (vaste ontvanger), al gemeld, of meldingen per betaling staan uit. */
  | { status: "quiet"; transactionId: string }
  | { status: "error" };

/** Twee keer dezelfde automatisering binnen twee minuten (iOS herhaalt soms) is één betaling. */
export function walletDedupeHash(userId: string, merchant: string, amount: number, now: Date): string {
  const bucket = Math.floor(now.getTime() / (2 * 60 * 1000));
  return `ap:${createHash("sha256").update(`${userId}|${merchantKey(merchant)}|${amount.toFixed(2)}|${bucket}`).digest("hex")}`;
}

export async function receiveWalletPayment(
  admin: Admin,
  input: { userId: string; merchant: string; amount: number; card?: string | null; previews: PreviewSetting; now?: Date },
): Promise<WalletIntakeResult> {
  const now = input.now ?? new Date();
  const today = toISODate(amsterdamToday(now));
  const amount = -Math.abs(input.amount);
  const card = input.card ?? null;
  const flags = await profileFlags(admin, input.userId);
  const credit = cardKind(card, flags.cards) === "credit";

  // Al door de bank geleverd (de automatisering liep achter)? Dan die regel gebruiken. Alleen een
  // bankregel die nog open is: een even grote betaling van gisteren die al in een potje zit, is een
  // andere betaling. Een creditcardbetaling komt nooit los via de bank en zoekt dus niet.
  const { data: banked } = credit
    ? { data: [] }
    : await admin
        .from("transactions")
        .select("id, booking_date, amount, counterparty, raw_counterparty, category_id, notified_at")
        .eq("user_id", input.userId)
        .eq("source", "bank")
        .eq("amount", amount)
        .is("wallet_merchant", null)
        .is("category_id", null)
        .gte("booking_date", toISODate(new Date(Date.parse(today) - MATCH_DAYS_BEFORE * DAY_MS)))
        .lte("booking_date", toISODate(new Date(Date.parse(today) + MATCH_DAYS_AFTER * DAY_MS)));
  const match = matchWalletPayments(
    (banked ?? []).map((b) => ({ ...b, amount: Number(b.amount) })),
    [{ id: "nieuw", booking_date: today, amount, merchant: input.merchant }],
  )[0];

  let transactionId: string;
  let categorized: boolean;
  if (match) {
    const row = banked!.find((b) => b.id === match.bankId)!;
    await admin
      .from("transactions")
      .update({ wallet_merchant: input.merchant, wallet_card: card })
      .eq("id", row.id)
      .eq("user_id", input.userId);
    transactionId = row.id;
    categorized = row.category_id !== null;
  } else {
    const { data: inserted, error } = await admin
      .from("transactions")
      .upsert(
        {
          user_id: input.userId,
          account_id: null,
          source: "applepay",
          dedupe_hash: walletDedupeHash(input.userId, input.merchant, Math.abs(amount), now),
          booking_date: today,
          booking_time: new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" }).format(now),
          amount,
          currency: "EUR",
          counterparty: input.merchant,
          raw_counterparty: input.merchant,
          wallet_merchant: input.merchant,
          wallet_card: card,
        },
        { onConflict: "user_id,dedupe_hash", ignoreDuplicates: true },
      )
      .select("id, category_id");
    if (error) return { status: "error" };
    if (!inserted || inserted.length === 0) {
      // Herhaling binnen twee minuten: de eerste regel hebben we al.
      const { data: existing } = await admin
        .from("transactions")
        .select("id")
        .eq("user_id", input.userId)
        .eq("dedupe_hash", walletDedupeHash(input.userId, input.merchant, Math.abs(amount), now))
        .maybeSingle();
      return existing ? { status: "quiet", transactionId: existing.id } : { status: "error" };
    }
    transactionId = inserted[0].id;
    // Vaste ontvanger: die deelt zelf in, net als bij de bank. Dan geen melding.
    const applied = await applyRules(admin, input.userId, { ids: [transactionId] }).catch(() => [] as string[]);
    categorized = applied.length > 0;
  }

  await logEventFor(admin, input.userId, "applepay_received", { transaction_id: transactionId, merged: Boolean(match), categorized });
  if (categorized) return { status: "quiet", transactionId };

  if (!flags.payment_notifications) return { status: "quiet", transactionId };
  const claimed = await claimNotification(admin, input.userId, [transactionId]);
  if (claimed.length === 0) return { status: "quiet", transactionId };

  const suggestion = await suggestCategory(admin, input.userId, input.merchant);
  return {
    status: "prompt",
    prompt: buildPrompt({
      userId: input.userId,
      transactionId,
      merchant: input.merchant,
      amount,
      suggestion,
      // Lokale melding: de iPhone gaf net zelf door hoe "Voorvertoning tonen" nu staat.
      details: showDetails(flags.lock_screen_details, input.previews),
    }),
  };
}

// --- Indelen vanaf melding of widget -----------------------------------------------------

export type DeviceAssignResult = "ok" | "already" | "not_found";

/**
 * Zet een open betaling in een potje, zonder verdeling. Alleen als hij nog open is: een tweede
 * tik (melding én widget) doet niets. Zelfde regels als assignCategory in de app.
 */
export async function assignFromDevice(admin: Admin, userId: string, transactionId: string, categoryId: string): Promise<DeviceAssignResult> {
  const { data: category } = await admin
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .eq("archived", false)
    .is("system_key", null)
    .maybeSingle();
  if (!category) return "not_found";
  const { data: updated, error } = await admin
    .from("transactions")
    .update({ category_id: categoryId, categorized_at: new Date().toISOString(), own_share: null, awaiting_refund: false })
    .eq("id", transactionId)
    .eq("user_id", userId)
    .is("category_id", null)
    .select("id");
  if (error) return "not_found";
  if (updated && updated.length > 0) return "ok";
  const { data: exists } = await admin.from("transactions").select("id").eq("id", transactionId).eq("user_id", userId).maybeSingle();
  return exists ? "already" : "not_found";
}

export async function skipFromDevice(admin: Admin, userId: string, transactionId: string): Promise<boolean> {
  const { data: row } = await admin
    .from("transactions")
    .select("skipped_count")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .is("category_id", null)
    .maybeSingle();
  if (!row) return false;
  const { error } = await admin
    .from("transactions")
    .update({ skipped_count: row.skipped_count + 1 })
    .eq("id", transactionId)
    .eq("user_id", userId);
  return !error;
}

// --- Grote widget ----------------------------------------------------------------------

export const WIDGET_BUTTONS = 4;

export interface WidgetCard {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  /** Potjes als knoppen: meestgebruikte eerst. */
  options: { id: string; name: string; color: string }[];
}

export async function oldestOpenCard(admin: Admin, userId: string): Promise<WidgetCard | null> {
  const { data: row } = await admin
    .from("transactions")
    .select("id, booking_date, amount, counterparty, wallet_merchant")
    .eq("user_id", userId)
    .is("category_id", null)
    .eq("is_internal_transfer", false)
    .order("skipped_count", { ascending: true })
    .order("booking_date", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!row) return null;

  const amount = Number(row.amount);
  const [categories, history] = await Promise.all([choosableCategories(admin, userId), recentChoices(admin, userId)]);
  // Uitgave: geen inkomstenpotjes; binnenkomend geld: alleen die.
  const fitting = categories.filter((c) => (amount < 0 ? !c.is_income : c.is_income));
  const pool = fitting.length > 0 ? fitting : categories;
  const merchant = row.wallet_merchant ?? row.counterparty;
  const suggested = amount < 0 ? pickSuggestion(history, merchant, new Set(pool.map((c) => c.id))) : null;
  let order = topCategories(history, pool.map((c) => c.id), WIDGET_BUTTONS);
  // Het voorstel altijd als eerste knop.
  if (suggested) order = [suggested, ...order.filter((id) => id !== suggested)].slice(0, WIDGET_BUTTONS);
  const options = order.map((id) => pool.find((c) => c.id === id)!).map((c) => ({ id: c.id, name: c.name, color: c.color }));

  return { id: row.id, merchant: merchant ?? "Onbekend", amount, date: row.booking_date, options };
}

/**
 * Gewone melding zonder knoppen (avondmelding, verlopende koppeling) naar de iPhone-app.
 * Webpush werkt niet in de app-schil; dit is daar de vervanging. Geeft het aantal bereikte toestellen.
 */
export async function sendNativeAlert(
  admin: Admin,
  sender: ApnsSender,
  userId: string,
  message: { title: string; body: string; url: string; tag: string },
): Promise<number> {
  if (!isApnsConfigured()) return 0;
  const devices = await pushDevicesFor(admin, userId);
  return sendToDevices(admin, sender, devices, () => apnsPayload({ title: message.title, body: message.body, threadId: message.tag, data: { url: message.url } }), message.tag);
}

/** Eén verbinding voor alle meldingen van één cron-ronde. */
export function createPaymentSender(): ApnsSender {
  return createApnsSender();
}
