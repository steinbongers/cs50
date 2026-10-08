/**
 * Pilotmetingen (spec 7). Pure rekenfuncties op geaggregeerde rijen;
 * geen individuele transacties komen op de adminpagina.
 */

export interface EventLite {
  userId: string;
  type: string;
  createdAt: string;
  durationMs: number | null;
}

export interface ProfileLite {
  id: string;
  createdAt: string;
}

export interface TxTiming {
  createdAt: string;
  categorizedAt: string | null;
  isInternal: boolean;
}

export interface ConnectionLite {
  status: string;
  validUntil: string | null;
}

const WEEK_MS = 7 * 864e5;

function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - weekday);
  return d;
}

export interface WeeklyActive {
  weekStart: string;
  activeUsers: number;
}

/** Actieve gebruikers per week (minstens één keer een transactie in een potje gestopt). */
export function weeklyActiveUsers(events: EventLite[], today: Date, weeks = 12): WeeklyActive[] {
  const result: WeeklyActive[] = [];
  const thisWeek = startOfWeek(today);
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek.getTime() - i * WEEK_MS);
    const end = new Date(start.getTime() + WEEK_MS);
    const users = new Set<string>();
    for (const e of events) {
      if (e.type !== "swipe") continue;
      const t = new Date(e.createdAt).getTime();
      if (t >= start.getTime() && t < end.getTime()) users.add(e.userId);
    }
    result.push({ weekStart: start.toISOString().slice(0, 10), activeUsers: users.size });
  }
  return result;
}

export const RETENTION_WEEKS = [1, 2, 4, 8, 12] as const;

export interface CohortRetention {
  cohortWeek: string;
  size: number;
  /** Per week (1, 2, 4, 8, 12): percentage actief, of null als de week nog niet voorbij is. */
  retention: Record<number, number | null>;
}

/**
 * Retentie per cohort (week van registratie). Week n = dagen 7(n-1) tot 7n na
 * registratie; iemand telt als hij in die week minstens één keer swipete.
 */
export function cohortRetention(profiles: ProfileLite[], events: EventLite[], today: Date): CohortRetention[] {
  const swipesByUser = new Map<string, number[]>();
  for (const e of events) {
    if (e.type !== "swipe") continue;
    const list = swipesByUser.get(e.userId) ?? [];
    list.push(new Date(e.createdAt).getTime());
    swipesByUser.set(e.userId, list);
  }

  const cohorts = new Map<string, ProfileLite[]>();
  for (const p of profiles) {
    const key = startOfWeek(new Date(p.createdAt)).toISOString().slice(0, 10);
    const list = cohorts.get(key) ?? [];
    list.push(p);
    cohorts.set(key, list);
  }

  const now = today.getTime();
  return [...cohorts.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([cohortWeek, members]) => {
      const retention: Record<number, number | null> = {};
      for (const week of RETENTION_WEEKS) {
        let eligible = 0;
        let active = 0;
        for (const member of members) {
          const signup = new Date(member.createdAt).getTime();
          const from = signup + (week - 1) * WEEK_MS;
          const to = signup + week * WEEK_MS;
          if (now < to) continue; // week nog niet voorbij
          eligible++;
          const swipes = swipesByUser.get(member.id) ?? [];
          if (swipes.some((t) => t >= from && t < to)) active++;
        }
        retention[week] = eligible === 0 ? null : Math.round((active / eligible) * 100);
      }
      return { cohortWeek, size: members.length, retention };
    });
}

/** Percentage transacties dat binnen 7 dagen na binnenkomst een potje kreeg (alleen transacties ouder dan 7 dagen). */
export function labeledWithin7Days(txs: TxTiming[], today: Date): { percentage: number | null; eligible: number } {
  const cutoff = today.getTime() - WEEK_MS;
  let eligible = 0;
  let within = 0;
  for (const t of txs) {
    if (t.isInternal) continue;
    const created = new Date(t.createdAt).getTime();
    if (created > cutoff) continue;
    eligible++;
    if (t.categorizedAt && new Date(t.categorizedAt).getTime() - created <= WEEK_MS) within++;
  }
  return { percentage: eligible === 0 ? null : Math.round((within / eligible) * 100), eligible };
}

export function swipeStats(events: EventLite[]): { swipes: number; averageMs: number | null; undos: number; undoRate: number | null } {
  const durations: number[] = [];
  let swipes = 0;
  let undos = 0;
  for (const e of events) {
    if (e.type === "swipe") {
      swipes++;
      if (e.durationMs !== null && e.durationMs > 0 && e.durationMs < 10 * 60 * 1000) durations.push(e.durationMs);
    } else if (e.type === "undo") {
      undos++;
    }
  }
  const averageMs = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
  return { swipes, averageMs, undos, undoRate: swipes ? Math.round((undos / swipes) * 1000) / 10 : null };
}

export function connectionStats(connections: ConnectionLite[], reconnectEvents: number, today: Date): { total: number; expired: number; reconnected: number } {
  const now = today.getTime();
  let expired = 0;
  for (const c of connections) {
    if (c.status === "expired" || (c.validUntil !== null && new Date(c.validUntil).getTime() < now)) expired++;
  }
  return { total: connections.length, expired, reconnected: reconnectEvents };
}
