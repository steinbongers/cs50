import "server-only";
import { isAdminEmail } from "@/lib/admin/access";
import {
  excludeAdmins,
  type ChurnLite,
  type ConnectionLite,
  type EventLite,
  type PotjeCategory,
  type PotjeTx,
  type ProfileLite,
  type ShareLite,
  type StreakTx,
  type TxTiming,
} from "@/lib/admin/metrics";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { InviteCodeRow } from "@/lib/supabase/types";

/** Venster voor events en transacties. */
export const WINDOW_DAYS = 120;

type AdminClient = ReturnType<typeof createAdminClient>;

/** Id's van alle accounts waarvan het e-mailadres in ADMIN_EMAILS staat. */
async function adminUserIds(admin: AdminClient): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Gegevens konden niet worden geladen.");
    for (const u of data.users) if (isAdminEmail(u.email)) ids.add(u.id);
    if (data.users.length < 1000) break;
  }
  return ids;
}

function toPayload(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export interface AdminData {
  events: EventLite[];
  profiles: ProfileLite[];
  txTimings: TxTiming[];
  streakTxs: StreakTx[];
  potjeTxs: PotjeTx[];
  categories: PotjeCategory[];
  shares: ShareLite[];
  churn: ChurnLite[];
  connections: ConnectionLite[];
  codes: InviteCodeRow[];
}

/**
 * Laadt alle rijen voor /admin via de service role, zonder admins.
 * Alles pagineren: Supabase geeft anders stil maar 1000 rijen en de cijfers kloppen niet meer.
 * Er wordt niets gelogd.
 */
export async function loadAdminData(today: Date): Promise<AdminData> {
  const admin = createAdminClient();
  const since = new Date(today.getTime() - WINDOW_DAYS * 864e5).toISOString();

  const [adminIds, events, profiles, txs, categories, shares, churn, { data: connections }, { data: codes }] = await Promise.all([
    adminUserIds(admin),
    fetchAll((from, to) => admin.from("events").select("user_id, type, created_at, payload").gte("created_at", since).order("id").range(from, to)),
    fetchAll((from, to) => admin.from("profiles").select("id, created_at, onboarding_done").order("id").range(from, to)),
    fetchAll((from, to) =>
      admin
        .from("transactions")
        .select("user_id, created_at, categorized_at, is_internal_transfer, category_id, amount, own_share")
        .gte("created_at", since)
        .order("id")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      admin.from("categories").select("id, user_id, name, is_income, system_key, archived, monthly_budget, goal_amount").order("id").range(from, to),
    ),
    fetchAll((from, to) => admin.from("transaction_shares").select("user_id, created_at, status, received_at").gte("created_at", since).order("id").range(from, to)),
    fetchAll((from, to) => admin.from("churn_log").select("cohort_week, days_since_signup, created_at").order("id").range(from, to)),
    admin.from("bank_connections").select("user_id, status, valid_until").eq("provider", "enablebanking"),
    admin.from("invite_codes").select("*").order("created_at", { ascending: false }),
  ]);

  const ownTxs = excludeAdmins(txs, adminIds, (t) => t.user_id);

  return {
    events: excludeAdmins(events, adminIds, (e) => e.user_id).map((e) => {
      const payload = toPayload(e.payload);
      return {
        userId: e.user_id,
        type: e.type,
        createdAt: e.created_at,
        durationMs: typeof payload.duration_ms === "number" ? payload.duration_ms : null,
        payload,
      };
    }),
    profiles: excludeAdmins(profiles, adminIds, (p) => p.id).map((p) => ({ id: p.id, createdAt: p.created_at, onboardingDone: p.onboarding_done })),
    txTimings: ownTxs.map((t) => ({ userId: t.user_id, createdAt: t.created_at, categorizedAt: t.categorized_at, isInternal: t.is_internal_transfer })),
    streakTxs: ownTxs.map((t) => ({ userId: t.user_id, createdAt: t.created_at, categorizedAt: t.categorized_at, isInternal: t.is_internal_transfer })),
    potjeTxs: ownTxs.map((t) => ({
      categoryId: t.category_id,
      amount: Number(t.amount),
      ownShare: num(t.own_share),
      isInternal: t.is_internal_transfer,
    })),
    categories: excludeAdmins(categories, adminIds, (c) => c.user_id).map((c) => ({
      id: c.id,
      userId: c.user_id,
      name: c.name,
      isIncome: c.is_income,
      systemKey: c.system_key,
      archived: c.archived,
      monthlyBudget: num(c.monthly_budget),
      goalAmount: num(c.goal_amount),
    })),
    shares: excludeAdmins(shares, adminIds, (s) => s.user_id).map((s) => ({ userId: s.user_id, createdAt: s.created_at, status: s.status, receivedAt: s.received_at })),
    churn: churn.map((c) => ({ cohortWeek: c.cohort_week, daysSinceSignup: c.days_since_signup, createdAt: c.created_at })),
    connections: excludeAdmins(connections ?? [], adminIds, (c) => c.user_id).map((c) => ({ status: c.status, validUntil: c.valid_until })),
    codes: codes ?? [],
  };
}
