/**
 * Seed-script voor lokale ontwikkeling.
 *
 * Maakt (of hergebruikt) een testgebruiker, de startset potjes, één CSV-"koppeling"
 * met rekening en 60 realistische neptransacties. Deterministisch: elke run geeft
 * dezelfde data. Bestaande data van de testgebruiker wordt eerst verwijderd.
 *
 * Gebruik:  npm run seed            (leest .env.local)
 * Vereist:  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, optioneel SEED_EMAIL/SEED_PASSWORD
 */
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_CATEGORIES } from "../lib/categories/defaults";
import { dedupeHash } from "../lib/transactions/dedupe";
import type { Database, SwipeDirection } from "../lib/supabase/types";
import { toISODate } from "../lib/format";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const seedEmail = process.env.SEED_EMAIL ?? "test@example.com";
const seedPassword = process.env.SEED_PASSWORD ?? "test-wachtwoord-1234";

if (!url || !secretKey) {
  console.error("Zet NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SECRET_KEY in .env.local.");
  process.exit(1);
}

const supabase = createClient<Database>(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- deterministische random ------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261008);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const roundCents = (n: number) => Math.round(n * 100) / 100;

// --- tegenpartijen per potje ------------------------------------------------
type Template = {
  categoryKey: string;
  counterparty: string;
  description: string;
  min: number;
  max: number;
  weight: number;
};

const TEMPLATES: Template[] = [
  { categoryKey: "boodschappen", counterparty: "Albert Heijn 1234 AMSTERDAM", description: "Betaalautomaat", min: 4, max: 48, weight: 9 },
  { categoryKey: "boodschappen", counterparty: "Jumbo Utrecht Centrum", description: "Betaalautomaat", min: 6, max: 55, weight: 5 },
  { categoryKey: "boodschappen", counterparty: "Lidl 540 Rotterdam", description: "Betaalautomaat", min: 5, max: 38, weight: 3 },
  { categoryKey: "boodschappen", counterparty: "Picnic", description: "Bestelling", min: 25, max: 70, weight: 2 },
  { categoryKey: "boodschappen", counterparty: "Kruidvat 8821", description: "Betaalautomaat", min: 3, max: 22, weight: 2 },
  { categoryKey: "uit-eten", counterparty: "Thuisbezorgd.nl", description: "Bestelling 4857201", min: 14, max: 42, weight: 4 },
  { categoryKey: "uit-eten", counterparty: "Coffeecompany Amsterdam", description: "Betaalautomaat", min: 3, max: 9, weight: 5 },
  { categoryKey: "uit-eten", counterparty: "Cafe De Zwart", description: "Betaalautomaat", min: 6, max: 34, weight: 3 },
  { categoryKey: "uit-eten", counterparty: "FEBO Leidsestraat", description: "Betaalautomaat", min: 3, max: 12, weight: 2 },
  { categoryKey: "uit-eten", counterparty: "Bakkerij Bart", description: "Betaalautomaat", min: 2, max: 8, weight: 3 },
  { categoryKey: "vervoer", counterparty: "NS Reizigers", description: "OVpay reis", min: 2.5, max: 24, weight: 6 },
  { categoryKey: "vervoer", counterparty: "GVB", description: "OVpay reis", min: 1.5, max: 4.5, weight: 4 },
  { categoryKey: "vervoer", counterparty: "Swapfiets", description: "Maandabonnement", min: 19.9, max: 19.9, weight: 1 },
  { categoryKey: "vervoer", counterparty: "Uber", description: "Rit", min: 9, max: 28, weight: 1 },
  { categoryKey: "wonen", counterparty: "Woningstichting Rochdale", description: "Huur", min: 650, max: 650, weight: 1 },
  { categoryKey: "wonen", counterparty: "Vattenfall", description: "Termijnbedrag energie", min: 95, max: 95, weight: 1 },
  { categoryKey: "wonen", counterparty: "IKEA Amsterdam", description: "Betaalautomaat", min: 12, max: 89, weight: 1 },
  { categoryKey: "abonnementen", counterparty: "Spotify AB", description: "Premium Student", min: 6.99, max: 6.99, weight: 1 },
  { categoryKey: "abonnementen", counterparty: "Netflix International", description: "Abonnement", min: 13.99, max: 13.99, weight: 1 },
  { categoryKey: "abonnementen", counterparty: "Odido Netherlands", description: "Factuur mobiel", min: 22.5, max: 22.5, weight: 1 },
  { categoryKey: "abonnementen", counterparty: "Basic-Fit", description: "Lidmaatschap", min: 29.99, max: 29.99, weight: 1 },
  { categoryKey: "abonnementen", counterparty: "Zilveren Kruis", description: "Zorgpremie", min: 142.5, max: 142.5, weight: 1 },
  { categoryKey: "kleding", counterparty: "Zara Kalverstraat", description: "Betaalautomaat", min: 19.95, max: 79.95, weight: 2 },
  { categoryKey: "kleding", counterparty: "H&M 0432", description: "Betaalautomaat", min: 9.99, max: 49.99, weight: 2 },
  { categoryKey: "kleding", counterparty: "Zalando Payments", description: "Bestelling", min: 24.95, max: 119, weight: 1 },
  { categoryKey: "uitgaan", counterparty: "Paradiso Amsterdam", description: "Tickets", min: 15, max: 45, weight: 1 },
  { categoryKey: "uitgaan", counterparty: "Pathe Theatres", description: "Betaalautomaat", min: 11.5, max: 27, weight: 2 },
  { categoryKey: "uitgaan", counterparty: "Bar Bukowski", description: "Betaalautomaat", min: 8, max: 46, weight: 2 },
  { categoryKey: "overig", counterparty: "bol.com", description: "Bestelling 9012345", min: 8, max: 65, weight: 2 },
  { categoryKey: "overig", counterparty: "Action 1182", description: "Betaalautomaat", min: 2, max: 18, weight: 2 },
  { categoryKey: "overig", counterparty: "HEMA Amsterdam CS", description: "Betaalautomaat", min: 3, max: 25, weight: 2 },
];

const INCOMING = [
  { counterparty: "Tikkie", description: "Tikkie van Sanne: etentje", min: 8, max: 35 },
  { counterparty: "Tikkie", description: "Tikkie van Daan: boodschappen", min: 5, max: 28 },
  { counterparty: "J. de Vries", description: "Terugbetaling concert", min: 15, max: 45 },
];

const SALARY = { counterparty: "Werkgever Horeca BV", description: "Salaris", min: 1180, max: 1180 };
const SAVINGS = { counterparty: "Eigen spaarrekening", description: "Maandelijks sparen", min: 100, max: 100 };

function weightedTemplate(): Template {
  const total = TEMPLATES.reduce((s, t) => s + t.weight, 0);
  let r = rand() * total;
  for (const t of TEMPLATES) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return TEMPLATES[0];
}

async function findOrCreateUser(): Promise<string> {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email?.toLowerCase() === seedEmail.toLowerCase());
  if (existing) return existing.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: seedEmail,
    password: seedPassword,
    email_confirm: true,
    user_metadata: { display_name: "Test" },
  });
  if (error || !data.user) throw error ?? new Error("Gebruiker kon niet worden aangemaakt.");
  return data.user.id;
}

async function main() {
  console.log(`Seeden voor ${seedEmail} …`);
  const userId = await findOrCreateUser();

  // Schoon eerdere seed-data op (cascade via connection/categories).
  await supabase.from("transactions").delete().eq("user_id", userId);
  await supabase.from("accounts").delete().eq("user_id", userId);
  await supabase.from("bank_connections").delete().eq("user_id", userId);
  await supabase.from("category_rules").delete().eq("user_id", userId);
  await supabase.from("categories").delete().eq("user_id", userId);
  await supabase.from("events").delete().eq("user_id", userId);

  await supabase
    .from("profiles")
    .upsert({ id: userId, display_name: "Test", onboarding_done: true }, { onConflict: "id" });

  // Potjes
  const directions: Record<string, SwipeDirection> = {
    boodschappen: "right",
    "uit-eten": "left",
    vervoer: "up",
    overig: "down",
  };
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .insert(
      DEFAULT_CATEGORIES.map((c, i) => ({
        user_id: userId,
        name: c.name,
        emoji: c.emoji,
        color: c.color,
        is_income: c.isIncome,
        sort_order: i,
        swipe_direction: directions[c.key] ?? null,
      })),
    )
    .select("id, name");
  if (catError || !categories) throw catError;

  const categoryIdByKey = new Map<string, string>();
  DEFAULT_CATEGORIES.forEach((c) => {
    const row = categories.find((r) => r.name === c.name);
    if (row) categoryIdByKey.set(c.key, row.id);
  });

  // Koppeling + rekening (CSV, zodat er geen echte bank nodig is)
  const { data: connection, error: connError } = await supabase
    .from("bank_connections")
    .insert({ user_id: userId, provider: "csv", aspsp_name: "Testbank (CSV)", status: "active" })
    .select("id")
    .single();
  if (connError || !connection) throw connError;

  const { data: account, error: accError } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      connection_id: connection.id,
      iban_masked: "NL** **** 4821",
      name: "Betaalrekening",
      currency: "EUR",
      last_balance: 1243.57,
      last_synced_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (accError || !account) throw accError;

  // 60 transacties over de afgelopen ~7 weken
  const today = new Date();
  const rows: Database["public"]["Tables"]["transactions"]["Insert"][] = [];

  const addRow = (daysAgo: number, amount: number, counterparty: string, description: string, categoryKey: string | null) => {
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    const bookingDate = toISODate(date);
    const categorize = categoryKey !== null && daysAgo > 21; // oudere transacties zijn al gelabeld
    rows.push({
      user_id: userId,
      account_id: account.id,
      booking_date: bookingDate,
      amount,
      currency: "EUR",
      counterparty,
      description,
      dedupe_hash: dedupeHash({ bookingDate, amount, counterparty, description }),
      category_id: categorize ? (categoryIdByKey.get(categoryKey) ?? null) : null,
      categorized_at: categorize ? new Date(date.getTime() + 36e5 * 6).toISOString() : null,
      source: "csv",
    });
  };

  // Vaste lasten en inkomen op de 1e/25e van de afgelopen twee maanden
  for (const monthsBack of [0, 1]) {
    const first = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
    const daysAgoFirst = Math.max(0, Math.round((today.getTime() - first.getTime()) / 864e5));
    addRow(daysAgoFirst, -650, "Woningstichting Rochdale", "Huur", "wonen");
    addRow(daysAgoFirst + 1, -95, "Vattenfall", "Termijnbedrag energie", "wonen");
    addRow(daysAgoFirst + 2, -142.5, "Zilveren Kruis", "Zorgpremie", "abonnementen");
    addRow(daysAgoFirst + 3, -SAVINGS.min, SAVINGS.counterparty, SAVINGS.description, "sparen");
    const salaryDaysAgo = daysAgoFirst + 6;
    addRow(salaryDaysAgo, SALARY.min, SALARY.counterparty, SALARY.description, "inkomen");
  }

  // Terugbetalingen
  for (let i = 0; i < 4; i++) {
    const t = pick(INCOMING);
    addRow(Math.floor(between(0, 40)), roundCents(between(t.min, t.max)), t.counterparty, t.description, "inkomen");
  }

  // Variabele uitgaven tot we op 60 zitten
  const seen = new Set(rows.map((r) => r.dedupe_hash));
  while (rows.length < 60) {
    const t = weightedTemplate();
    const daysAgo = Math.floor(between(0, 46));
    const amount = -roundCents(between(t.min, t.max));
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    const hash = dedupeHash({ bookingDate: toISODate(date), amount, counterparty: t.counterparty, description: t.description });
    if (seen.has(hash)) continue;
    seen.add(hash);
    addRow(daysAgo, amount, t.counterparty, t.description, t.categoryKey);
  }

  const { error: txError } = await supabase.from("transactions").insert(rows);
  if (txError) throw txError;

  const open = rows.filter((r) => !r.category_id).length;
  console.log(`Klaar: ${categories.length} potjes, ${rows.length} transacties (${open} nog te swipen).`);
  console.log(`Inloggen: ${seedEmail} / ${seedPassword}`);
}

main().catch((err) => {
  console.error("Seeden mislukt:", err instanceof Error ? err.message : err);
  process.exit(1);
});
