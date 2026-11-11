import "server-only";
import { ensureProfile, requireUser } from "@/lib/auth";
import { getPrimaryConnection } from "@/lib/bank/connections";
import { formatLongDate } from "@/lib/format";
import { amsterdamToday } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { loadFixedItems, loadPreviousMonth } from "./fixed-month-server";

/** Alles wat het scherm "Je vaste maand" nodig heeft (onboarding en Instellingen). */
export async function loadFixedMonthPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const supabase = await createClient();
  const [{ period, groups }, saved, connection] = await Promise.all([
    loadPreviousMonth(supabase, user.id, profile.salary_day, amsterdamToday()),
    loadFixedItems(supabase, user.id),
    getPrimaryConnection(supabase, user.id),
  ]);
  // "20 september tot 20 oktober": de einddatum is de eerste dag van de maand erna.
  const periodText = `${formatLongDate(period.startISO)} tot ${formatLongDate(period.endISO)}`;
  return { groups, saved, periodText, hasBank: connection !== null };
}
