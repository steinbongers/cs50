import type { SupabaseClient } from "@supabase/supabase-js";
import type { Period } from "@/lib/periods";
import type { Database } from "@/lib/supabase/types";

/**
 * Overzicht pas tonen als het iets zegt: vanaf de eerste periode (salarisdag tot salarisdag)
 * die de app van begin tot eind heeft gezien. Wie halverwege de maand begint, ziet anders een
 * halve maand met lage bedragen en een vergelijking die nergens op slaat.
 *
 * Wie bij het koppelen "sinds je laatste salaris" koos, heeft de lopende maand compleet en ziet
 * het overzicht meteen.
 */

/**
 * De dag waarop het overzicht begint, of null als het nu al zinvol is.
 * `trackingStart`: boekdatum van de oudste betaling die meetelt; null als er nog geen is.
 */
export function overviewStartsOn(trackingStart: string | null, current: Pick<Period, "startISO" | "endISO">): string | null {
  if (trackingStart === null) return null;
  return trackingStart <= current.startISO ? null : current.endISO;
}

/**
 * Boekdatum van de oudste betaling die meetelt: geen eigen overboeking en niet in Telt niet mee
 * (daar zet "Begin vanaf vandaag" alles van vóór de start). Werkt met een gebruikersclient en
 * met de service-role-client (cron); filtert daarom altijd op user_id.
 */
export async function loadTrackingStart(supabase: SupabaseClient<Database>, userId: string): Promise<string | null> {
  const { data: ignored } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("system_key", "negeer")
    .maybeSingle();
  let query = supabase
    .from("transactions")
    .select("booking_date")
    .eq("user_id", userId)
    .eq("is_internal_transfer", false)
    .order("booking_date", { ascending: true })
    .limit(1);
  if (ignored?.id) query = query.or(`category_id.is.null,category_id.neq.${ignored.id}`);
  const { data } = await query.maybeSingle();
  return data?.booking_date ?? null;
}
