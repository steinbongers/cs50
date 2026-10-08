import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/config/app";
import { isAdminUser } from "@/lib/admin/access";
import {
  RETENTION_WEEKS,
  cohortRetention,
  connectionStats,
  labeledWithin7Days,
  swipeStats,
  weeklyActiveUsers,
  type EventLite,
} from "@/lib/admin/metrics";
import { requireUser } from "@/lib/auth";
import { formatDayShort } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { InviteCodes } from "./invite-codes";

export const metadata: Metadata = { title: "Admin" };

/**
 * Pilotcijfers: alleen geaggregeerd, nooit individuele transacties.
 * Alleen voor e-mailadressen in ADMIN_EMAILS.
 */
export default async function AdminPage() {
  const user = await requireUser();
  if (!isAdminUser(user)) notFound();

  const admin = createAdminClient();
  const today = new Date();
  const since = new Date(today.getTime() - 120 * 864e5).toISOString();

  // Alles pagineren: Supabase geeft anders stil maar 1000 rijen en de cijfers kloppen niet meer.
  const [events, profiles, txs, { data: connections }, { data: codes }] = await Promise.all([
    fetchAll((from, to) =>
      admin
        .from("events")
        .select("user_id, type, created_at, payload")
        .gte("created_at", since)
        .in("type", ["swipe", "undo", "bank_reconnect"])
        .order("id")
        .range(from, to),
    ),
    fetchAll((from, to) => admin.from("profiles").select("id, created_at").order("id").range(from, to)),
    fetchAll((from, to) =>
      admin.from("transactions").select("created_at, categorized_at, is_internal_transfer").gte("created_at", since).order("id").range(from, to),
    ),
    admin.from("bank_connections").select("status, valid_until").eq("provider", "enablebanking"),
    admin.from("invite_codes").select("*").order("created_at", { ascending: false }),
  ]);

  const eventRows: EventLite[] = events.map((e) => {
    const payload = (e.payload ?? {}) as { duration_ms?: unknown };
    return {
      userId: e.user_id,
      type: e.type,
      createdAt: e.created_at,
      durationMs: typeof payload.duration_ms === "number" ? payload.duration_ms : null,
    };
  });
  const profileRows = profiles.map((p) => ({ id: p.id, createdAt: p.created_at }));
  const txRows = txs.map((t) => ({ createdAt: t.created_at, categorizedAt: t.categorized_at, isInternal: t.is_internal_transfer }));

  const weekly = weeklyActiveUsers(eventRows, today);
  const cohorts = cohortRetention(profileRows, eventRows, today);
  const labeled = labeledWithin7Days(txRows, today);
  const swipes = swipeStats(eventRows);
  const reconnects = eventRows.filter((e) => e.type === "bank_reconnect").length;
  const conn = connectionStats((connections ?? []).map((c) => ({ status: c.status, validUntil: c.valid_until })), reconnects, today);
  const maxWeekly = Math.max(1, ...weekly.map((w) => w.activeUsers));
  const topWeekly = weekly.reduce<(typeof weekly)[number] | null>((best, w) => (w.activeUsers > 0 && (!best || w.activeUsers > best.activeUsers) ? w : best), null);
  const weeklyLabel = topWeekly
    ? `Actieve gebruikers per week, laatste twaalf weken. Meeste in de week van ${formatDayShort(topWeekly.weekStart)}: ${topWeekly.activeUsers}.`
    : "Actieve gebruikers per week, laatste twaalf weken";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{APP_NAME}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Pilotcijfers</h1>
        </div>
        <Link href="/overzicht" className="text-sm font-medium text-primary">
          Naar de app
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Gebruikers" value={String(profileRows.length)} />
        <Stat label="Gelabeld binnen 7 dagen" value={labeled.percentage === null ? "–" : `${labeled.percentage}%`} hint={`${labeled.eligible} transacties`} />
        <Stat label="Tijd per swipe" value={swipes.averageMs === null ? "–" : `${(swipes.averageMs / 1000).toFixed(1)} s`} hint={`${swipes.swipes} swipes`} />
        <Stat label="Ongedaan gemaakt" value={String(swipes.undos)} hint={swipes.undoRate === null ? undefined : `${swipes.undoRate}% van de swipes`} />
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">Actieve gebruikers per week</h2>
        <p className="text-xs text-text-muted">Iemand is actief als hij die week minstens één transactie in een potje stopte.</p>
        <div className="flex h-28 items-end gap-1" role="img" aria-label={weeklyLabel}>
          {weekly.map((w) => (
            <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-text-muted">{w.activeUsers}</span>
              <div className="flex h-16 w-full items-end">
                <div className="w-full rounded-t-md bg-primary" style={{ height: `${Math.max(4, (w.activeUsers / maxWeekly) * 100)}%` }} title={`Week van ${formatDayShort(w.weekStart)}: ${w.activeUsers}`} />
              </div>
              <span className="text-[10px] tabular-nums text-text-muted">{formatDayShort(w.weekStart)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">Retentie per cohort</h2>
        <p className="text-xs text-text-muted">Percentage van de gebruikers die zich in die week registreerden en in week 1, 2, 4, 8 en 12 daarna nog swipeten. Het belangrijkste getal van de pilot.</p>
        {cohorts.length === 0 ? (
          <p className="text-sm text-text-muted">Nog geen gebruikers.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted">
                  <th className="py-1 pr-2 font-medium">Cohort (week van)</th>
                  <th className="py-1 pr-2 font-medium">Aantal</th>
                  {RETENTION_WEEKS.map((w) => (
                    <th key={w} className="py-1 pr-2 text-right font-medium">
                      W{w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.cohortWeek} className="border-t">
                    <td className="py-1.5 pr-2 tabular-nums">{c.cohortWeek}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{c.size}</td>
                    {RETENTION_WEEKS.map((w) => (
                      <td key={w} className="py-1.5 pr-2 text-right tabular-nums">
                        {c.retention[w] === null ? <span className="text-text-muted">–</span> : `${c.retention[w]}%`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-1">
        <h2 className="font-semibold">Bankkoppelingen</h2>
        <p className="text-sm text-text-muted">
          {conn.total} {conn.total === 1 ? "koppeling" : "koppelingen"}, {conn.expired} verlopen, {conn.reconnected} keer opnieuw gekoppeld.
        </p>
      </Card>

      <InviteCodes
        codes={(codes ?? []).map((c) => ({
          code: c.code,
          note: c.note,
          maxUses: c.max_uses,
          uses: c.uses,
          expired: c.expires_at !== null && new Date(c.expires_at).getTime() < today.getTime(),
        }))}
      />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="flex flex-col gap-0.5">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </Card>
  );
}
