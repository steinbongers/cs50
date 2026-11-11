import "server-only";
import { ensureProfile, requireUser } from "@/lib/auth";
import { getPrimaryConnection } from "@/lib/bank/connections";
import { formatLongDate } from "@/lib/format";
import { amsterdamToday } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { loadFixedItems, loadFixedWindow } from "./fixed-month-server";

/** Alles wat het scherm "Je vaste maand" nodig heeft (onboarding en Instellingen). */
export async function loadFixedMonthPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const supabase = await createClient();
  const [{ period, groups }, saved, connection] = await Promise.all([
    loadFixedWindow(supabase, user.id, profile.salary_day, amsterdamToday()),
    loadFixedItems(supabase, user.id),
    getPrimaryConnection(supabase, user.id),
  ]);
  // "20 oktober tot vandaag", of bij een net begonnen maand de hele vorige: "20 september tot 20 oktober".
  const periodText = period.current
    ? `${formatLongDate(period.startISO)} tot vandaag`
    : `${formatLongDate(period.startISO)} tot ${formatLongDate(period.endISO)}`;
  return { groups, saved, periodText, hasBank: connection !== null };
}
