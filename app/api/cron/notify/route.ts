import { NextResponse, type NextRequest } from "next/server";
import { CONNECTION_EXPIRY_WARNING_DAYS } from "@/config/app";
import { daysUntil } from "@/lib/bank/connections";
import { toISODate } from "@/lib/format";
import { currentPeriod } from "@/lib/periods";
import { expiringMessage, monthReviewMessage, openCardsMessage } from "@/lib/push/copy";
import { isPushConfigured, sendPushToUser } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

function amsterdamNow(): { hour: number; dateISO: string; dayIndex: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const dateISO = `${get("year")}-${get("month")}-${get("day")}`;
  return { hour: Number(get("hour")) % 24, dateISO, dayIndex: Math.floor(now.getTime() / 864e5) };
}

/**
 * Dagelijkse meldingen om 20:00 Nederlandse tijd. De planning (GitHub Actions,
 * zie .github/workflows/cron.yml) roept deze route om 18:00 en 19:00 UTC aan,
 * voor zomer- en wintertijd; alleen de aanroep die op 20:00 valt stuurt.
 * Per gebruiker hoogstens één melding per dag: Jouw maand op de salarisdag,
 * anders het aantal kaartjes dat ligt. Verloopmeldingen apart, eenmalig.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }
  if (!isPushConfigured()) return NextResponse.json({ skipped: "push niet ingesteld" });

  const { hour, dateISO, dayIndex } = amsterdamNow();
  const force = request.nextUrl.searchParams.get("force") === "1";
  if (hour !== 20 && !force) return NextResponse.json({ skipped: `het is ${hour}:00 in Amsterdam` });

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, salary_day, month_review_seen_for, last_push_at, notifications_enabled")
    .eq("notifications_enabled", true);

  let sent = 0;
  let skipped = 0;

  for (const profile of profiles ?? []) {
    const lastPushDay = profile.last_push_at ? toISODate(new Date(profile.last_push_at)) : null;
    if (lastPushDay === dateISO && !force) {
      skipped++;
      continue;
    }

    const period = currentPeriod(profile.salary_day);
    let message: { title: string; body: string; url: string; tag: string } | null = null;

    if (period.startISO === dateISO && profile.month_review_seen_for !== period.startISO) {
      message = { ...monthReviewMessage(), url: "/overzicht", tag: "jouw-maand" };
    } else {
      const { count } = await admin
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .is("category_id", null)
        .eq("is_internal_transfer", false);
      if ((count ?? 0) > 0) message = { ...openCardsMessage(count ?? 0, dayIndex), url: "/swipen", tag: "kaartjes" };
    }

    if (!message) {
      skipped++;
      continue;
    }

    const delivered = await sendPushToUser(admin, profile.id, message);
    if (delivered > 0) {
      sent++;
      await admin.from("profiles").update({ last_push_at: new Date().toISOString() }).eq("id", profile.id);
      await admin.from("events").insert({ user_id: profile.id, type: "push_sent", payload: { tag: message.tag } });
    }
  }

  // Verlopende koppelingen: één melding per koppeling.
  let expiryNotified = 0;
  const { data: connections } = await admin
    .from("bank_connections")
    .select("id, user_id, valid_until, expiry_notified_at, status")
    .eq("provider", "enablebanking")
    .in("status", ["active", "expiring"])
    .is("expiry_notified_at", null);
  for (const connection of connections ?? []) {
    const days = daysUntil(connection.valid_until);
    if (days === null || days > CONNECTION_EXPIRY_WARNING_DAYS) continue;
    const delivered = await sendPushToUser(admin, connection.user_id, { ...expiringMessage(days), url: "/bank/koppelen?reconnect=1", tag: "bank-verloopt" });
    await admin
      .from("bank_connections")
      .update({ expiry_notified_at: new Date().toISOString(), status: days < 0 ? "expired" : "expiring" })
      .eq("id", connection.id);
    if (delivered > 0) expiryNotified++;
  }

  return NextResponse.json({ sent, skipped, expiryNotified });
}
