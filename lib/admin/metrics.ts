/**
 * Pilotmetingen (productplan 6). Pure rekenfuncties op geaggregeerde rijen;
 * geen individuele transacties, namen of bedragen per gebruiker komen op de adminpagina.
 * Admins moeten al vóór deze functies uit de rijen zijn gefilterd (zie `excludeAdmins`).
 */
import { DEFAULT_CATEGORIES, QUICK_SUGGESTIONS } from "@/lib/categories/defaults";
import { dailyStreak, type TxLite } from "@/lib/insights/compute";

export interface EventLite {
  userId: string;
  type: string;
  createdAt: string;
  durationMs: number | null;
  /** Ruwe payload (alleen enums, aantallen, duren en buckets). */
  payload?: Record<string, unknown>;
}

export interface ProfileLite {
  id: string;
  createdAt: string;
  onboardingDone?: boolean;
}

export interface TxTiming {
  createdAt: string;
  categorizedAt: string | null;
  isInternal: boolean;
  userId?: string;
}

export interface ConnectionLite {
  status: string;
  validUntil: string | null;
}

/** Een regel uit `churn_log`: bewust zonder user_id. */
export interface ChurnLite {
  cohortWeek: string;
  daysSinceSignup: number;
  createdAt: string;
}

const DAY_MS = 864e5;
const WEEK_MS = 7 * DAY_MS;
/** Onder dit aantal gebruikers tonen we geen percentage. */
export const MIN_USERS = 5;
/** Cohorten kleiner dan dit staan grijs. */
export const MIN_COHORT = 3;

// ---------------------------------------------------------------------------
// Basis
// ---------------------------------------------------------------------------

/** Percentiel (0-100) met lineaire interpolatie; null bij een lege lijst. */
export function percentile(values: number[], p: number): number | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const clamped = Math.min(100, Math.max(0, p));
  const index = (clamped / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function median(values: number[]): number | null {
  return percentile(values, 50);
}

export interface Ratio {
  part: number;
  whole: number;
  /** Afgerond percentage, of null als `whole` 0 is. */
  percentage: number | null;
  /** Aantal gebruikers waarop het getal rust (voor de drempel van 5). */
  users: number;
}

export function ratio(part: number, whole: number, users: number = whole): Ratio {
  return { part, whole, percentage: whole === 0 ? null : Math.round((part / whole) * 100), users };
}

/** Genoeg gebruikers om een getal te tonen? */
export function enoughData(users: number): boolean {
  return users >= MIN_USERS;
}

/** "Nog te weinig data (3 gebruikers)". */
export function tooLittleData(users: number): string {
  return `Nog te weinig data (${users} ${users === 1 ? "gebruiker" : "gebruikers"})`;
}

/** "7 van 9". */
export function partOf(r: Pick<Ratio, "part" | "whole">): string {
  return `${r.part} van ${r.whole}`;
}

/** Haalt rijen van admins eruit. Admins tellen nergens mee. */
export function excludeAdmins<T>(rows: T[], adminIds: ReadonlySet<string>, idOf: (row: T) => string): T[] {
  if (adminIds.size === 0) return rows;
  return rows.filter((row) => !adminIds.has(idOf(row)));
}

function ms(iso: string): number {
  return new Date(iso).getTime();
}

function str(payload: Record<string, unknown> | undefined, key: string): string | null {
  const v = payload?.[key];
  return typeof v === "string" ? v : null;
}

const amsterdamDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" });

/** Kalenderdag in Nederland (YYYY-MM-DD). */
function dayKey(iso: string): string {
  return amsterdamDay.format(new Date(iso));
}

/** Maandag 00:00 UTC van de week, gelijk aan churnEntry (app/(app)/instellingen/churn.ts). */
function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - weekday);
  return d;
}

// ---------------------------------------------------------------------------
// Actieve gebruikers per week
// ---------------------------------------------------------------------------

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
      const t = ms(e.createdAt);
      if (t >= start.getTime() && t < end.getTime()) users.add(e.userId);
    }
    result.push({ weekStart: start.toISOString().slice(0, 10), activeUsers: users.size });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Retentie per cohort
// ---------------------------------------------------------------------------

export const RETENTION_WEEKS = [1, 2, 4, 8, 12] as const;

export interface CohortRetention {
  cohortWeek: string;
  /** Aantal registraties in die week, inclusief verwijderde accounts. */
  size: number;
  /** Waarvan inmiddels verwijderd (uit churn_log). */
  churned: number;
  /** Minder dan 3 mensen: grijs tonen. */
  small: boolean;
  /** Per week (1, 2, 4, 8, 12): percentage actief, of null als de week nog niet voorbij is. */
  retention: Record<number, number | null>;
  /** Per week: actief en meetellend, of null als de week nog niet voorbij is. */
  counts: Record<number, { active: number; eligible: number } | null>;
}

/**
 * Retentie per cohort (week van registratie). Week n = dagen 7(n-1) tot 7n na
 * registratie; iemand telt als hij in die week minstens één keer swipete.
 *
 * Verwijderde accounts (churn_log) tellen mee in de cohortgrootte en tellen als
 * niet actief in weken die begonnen nadat het account weg was. Weken waarin ze er
 * nog waren kennen we niet meer (hun events zijn weg); die slaan we voor hen over.
 */
export function cohortRetention(
  profiles: ProfileLite[],
  events: EventLite[],
  today: Date,
  churn: ChurnLite[] = [],
  /** Begin van het geladen eventvenster (ms). Weken die eerder beginnen tellen niet mee: daar ontbreken swipes. */
  eventsSince: number = Number.NEGATIVE_INFINITY,
): CohortRetention[] {
  const swipesByUser = new Map<string, number[]>();
  for (const e of events) {
    if (e.type !== "swipe") continue;
    const list = swipesByUser.get(e.userId) ?? [];
    list.push(ms(e.createdAt));
    swipesByUser.set(e.userId, list);
  }

  interface Member {
    signup: number;
    swipes: number[];
    deletedAt: number | null;
  }
  const cohorts = new Map<string, Member[]>();
  const add = (key: string, m: Member) => {
    const list = cohorts.get(key) ?? [];
    list.push(m);
    cohorts.set(key, list);
  };
  for (const p of profiles) {
    add(startOfWeek(new Date(p.createdAt)).toISOString().slice(0, 10), { signup: ms(p.createdAt), swipes: swipesByUser.get(p.id) ?? [], deletedAt: null });
  }
  for (const c of churn) {
    const deletedAt = ms(c.createdAt);
    if (!Number.isFinite(deletedAt)) continue;
    add(c.cohortWeek, { signup: deletedAt - Math.max(0, c.daysSinceSignup) * DAY_MS, swipes: [], deletedAt });
  }

  const now = today.getTime();
  return [...cohorts.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([cohortWeek, members]) => {
      const retention: Record<number, number | null> = {};
      const counts: Record<number, { active: number; eligible: number } | null> = {};
      for (const week of RETENTION_WEEKS) {
        let eligible = 0;
        let active = 0;
        for (const member of members) {
          const from = member.signup + (week - 1) * WEEK_MS;
          const to = member.signup + week * WEEK_MS;
          if (now < to) continue; // week nog niet voorbij
          if (from < eventsSince) continue; // buiten het eventvenster: onbekend, niet 'niet actief'
          if (member.deletedAt !== null) {
            if (member.deletedAt > from) continue; // toen nog aanwezig: onbekend
            eligible++;
            continue;
          }
          eligible++;
          if (member.swipes.some((t) => t >= from && t < to)) active++;
        }
        retention[week] = eligible === 0 ? null : Math.round((active / eligible) * 100);
        counts[week] = eligible === 0 ? null : { active, eligible };
      }
      const churned = members.filter((m) => m.deletedAt !== null).length;
      return { cohortWeek, size: members.length, churned, small: members.length < MIN_COHORT, retention, counts };
    });
}

/** Retentie in week `week` over alle cohorten samen (voor de noordster-tegel). */
export function overallRetention(cohorts: CohortRetention[], week: number): Ratio {
  let active = 0;
  let eligible = 0;
  for (const c of cohorts) {
    const count = c.counts[week];
    if (!count) continue;
    active += count.active;
    eligible += count.eligible;
  }
  return ratio(active, eligible);
}

// ---------------------------------------------------------------------------
// Noordsterren
// ---------------------------------------------------------------------------

/** Percentage transacties dat binnen 7 dagen na binnenkomst een potje kreeg (alleen transacties ouder dan 7 dagen). */
export function labeledWithin7Days(
  txs: TxTiming[],
  today: Date,
): { percentage: number | null; eligible: number; within: number; users: number } {
  const cutoff = today.getTime() - WEEK_MS;
  let eligible = 0;
  let within = 0;
  const users = new Set<string>();
  for (const t of txs) {
    if (t.isInternal) continue;
    const created = ms(t.createdAt);
    if (created > cutoff) continue;
    eligible++;
    if (t.userId) users.add(t.userId);
    if (t.categorizedAt && ms(t.categorizedAt) - created <= WEEK_MS) within++;
  }
  return { percentage: eligible === 0 ? null : Math.round((within / eligible) * 100), eligible, within, users: users.size };
}

export const ACTIVATION_WINDOW_MS = 72 * 3600 * 1000;
export const ACTIVATION_SWIPES = 10;

/**
 * Activatie: onboarding af, bank gekoppeld en minstens 10 kaartjes ingedeeld,
 * allemaal binnen 72 uur na de registratie. Alleen gebruikers die al 72 uur
 * binnen zijn tellen mee.
 */
export function activation(users: ProfileLite[], events: EventLite[], today: Date): Ratio {
  const byUser = new Map<string, EventLite[]>();
  for (const e of events) {
    if (e.type !== "swipe" && e.type !== "bank_connected") continue;
    const list = byUser.get(e.userId) ?? [];
    list.push(e);
    byUser.set(e.userId, list);
  }
  let eligible = 0;
  let activated = 0;
  for (const u of users) {
    const signup = ms(u.createdAt);
    const deadline = signup + ACTIVATION_WINDOW_MS;
    if (today.getTime() < deadline) continue;
    eligible++;
    if (!u.onboardingDone) continue;
    const inWindow = (byUser.get(u.id) ?? []).filter((e) => {
      const t = ms(e.createdAt);
      return t >= signup && t <= deadline;
    });
    const bank = inWindow.some((e) => e.type === "bank_connected");
    const swipes = inWindow.filter((e) => e.type === "swipe").length;
    if (bank && swipes >= ACTIVATION_SWIPES) activated++;
  }
  return ratio(activated, eligible);
}

/** Alleen echte kaartjes: geen coachkaarten, geen terugbetalingen, geen onzinduren. */
function isTimedCard(e: EventLite): boolean {
  if (e.type !== "swipe") return false;
  if (e.payload?.coach === true || e.payload?.flow === "repayment") return false;
  return e.durationMs !== null && e.durationMs > 0 && e.durationMs < 10 * 60 * 1000;
}

export interface CardTiming {
  medianMs: number | null;
  p75Ms: number | null;
  cards: number;
  users: number;
}

/** Mediaan en p75 van de tijd per kaartje (zonder coach en terugbetalingen). */
export function timePerCard(events: EventLite[]): CardTiming {
  const durations: number[] = [];
  const users = new Set<string>();
  for (const e of events) {
    if (!isTimedCard(e)) continue;
    durations.push(e.durationMs as number);
    users.add(e.userId);
  }
  const med = median(durations);
  const p75 = percentile(durations, 75);
  return {
    medianMs: med === null ? null : Math.round(med),
    p75Ms: p75 === null ? null : Math.round(p75),
    cards: durations.length,
    users: users.size,
  };
}

// ---------------------------------------------------------------------------
// Trechter
// ---------------------------------------------------------------------------

export type FunnelStepKey = "signup" | "potjes" | "salarisdag" | "bank_started" | "bank_connected" | "coach";

export interface FunnelStep {
  key: FunnelStepKey;
  label: string;
  /** Naam van de stap in de zin over uitval ("bank koppelen"). */
  dropLabel: string;
  count: number;
}

const FUNNEL: readonly { key: FunnelStepKey; label: string; dropLabel: string; match: (e: EventLite) => boolean }[] = [
  { key: "signup", label: "Registratie", dropLabel: "registreren", match: (e) => e.type === "signup_completed" },
  { key: "potjes", label: "Potjes", dropLabel: "potjes kiezen", match: (e) => e.type === "onboarding_step_done" && str(e.payload, "step") === "potjes" },
  { key: "salarisdag", label: "Salarisdag", dropLabel: "salarisdag", match: (e) => e.type === "onboarding_step_done" && str(e.payload, "step") === "salarisdag" },
  { key: "bank_started", label: "Bank gestart", dropLabel: "naar de bank", match: (e) => e.type === "bank_connect_started" },
  { key: "bank_connected", label: "Bank gekoppeld", dropLabel: "bank koppelen", match: (e) => e.type === "bank_connected" },
  { key: "coach", label: "Eerste kaartjes", dropLabel: "eerste kaartjes", match: (e) => e.type === "coach_completed" },
];

export interface FunnelResult {
  steps: FunnelStep[];
  biggestDrop: { step: FunnelStep; lost: number; of: number } | null;
}

/** Aantal gebruikers per onboardingstap, plus de stap met de meeste uitval. */
export function funnel(events: EventLite[], profiles: ProfileLite[]): FunnelResult {
  const known = new Set(profiles.map((p) => p.id));
  const steps: FunnelStep[] = FUNNEL.map((def) => {
    const users = new Set<string>();
    for (const e of events) if (known.has(e.userId) && def.match(e)) users.add(e.userId);
    return { key: def.key, label: def.label, dropLabel: def.dropLabel, count: users.size };
  });
  return { steps, biggestDrop: biggestDrop(steps) };
}

export function biggestDrop(steps: FunnelStep[]): FunnelResult["biggestDrop"] {
  let best: FunnelResult["biggestDrop"] = null;
  for (let i = 1; i < steps.length; i++) {
    const of = steps[i - 1].count;
    const lost = of - steps[i].count;
    if (of > 0 && lost > 0 && (!best || lost > best.lost)) best = { step: steps[i], lost, of };
  }
  return best;
}

// ---------------------------------------------------------------------------
// Twijfel
// ---------------------------------------------------------------------------

function countUsers(events: EventLite[], types: string[]): number {
  const users = new Set<string>();
  for (const e of events) if (types.includes(e.type)) users.add(e.userId);
  return users.size;
}

/** Later per swipe: hoe vaak een kaartje werd uitgesteld. */
export function laterRatio(events: EventLite[]): Ratio {
  const skips = events.filter((e) => e.type === "skip").length;
  const swipes = events.filter((e) => e.type === "swipe").length;
  return ratio(skips, swipes, countUsers(events, ["swipe", "skip"]));
}

/** Ongedaan maken per swipe. */
export function undoRate(events: EventLite[]): Ratio {
  const undos = events.filter((e) => e.type === "undo").length;
  const swipes = events.filter((e) => e.type === "swipe").length;
  return ratio(undos, swipes, countUsers(events, ["swipe", "undo"]));
}

/** @deprecated Gebruik `timePerCard` (mediaan) en `undoRate`. Blijft voor bestaande aanroepers. */
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

// ---------------------------------------------------------------------------
// Gewoonte
// ---------------------------------------------------------------------------

export interface StreakTx {
  userId: string;
  createdAt: string;
  categorizedAt: string | null;
  isInternal: boolean;
}

export const STREAK_BUCKETS = ["0", "1-2", "3-6", "7+"] as const;
export type StreakBucket = (typeof STREAK_BUCKETS)[number];

export function streakBucket(days: number): StreakBucket {
  if (days <= 0) return "0";
  if (days <= 2) return "1-2";
  if (days <= 6) return "3-6";
  return "7+";
}

export interface Habit {
  /** Mediaan van het gemiddelde aantal actieve dagen per week, per actieve gebruiker. */
  medianActiveDays: number | null;
  /** Gebruikers die in de laatste `weeks` weken minstens één dag actief waren. */
  activeUsers: number;
  streaks: Record<StreakBucket, number>;
  /** Gebruikers met minstens één kaartje (basis van de streakverdeling). */
  streakUsers: number;
}

/**
 * Gewoonte. Een actieve dag is een (Nederlandse) kalenderdag met minstens één swipe.
 * Per gebruiker het gemiddelde aantal actieve dagen over de weken (laatste `weeks`
 * blokken van 7 dagen) waarin hij actief was; daarvan de mediaan.
 * De streak komt uit `dailyStreak`, dezelfde regel als in de app.
 */
export function habit(events: EventLite[], txs: StreakTx[], today: Date, weeks = 4): Habit {
  const end = today.getTime();
  const start = end - weeks * WEEK_MS;
  const daysByUserWeek = new Map<string, Map<number, Set<string>>>();
  for (const e of events) {
    if (e.type !== "swipe") continue;
    const t = ms(e.createdAt);
    if (t < start || t >= end) continue;
    const week = Math.floor((end - t) / WEEK_MS);
    const perUser = daysByUserWeek.get(e.userId) ?? new Map<number, Set<string>>();
    const days = perUser.get(week) ?? new Set<string>();
    days.add(dayKey(e.createdAt));
    perUser.set(week, days);
    daysByUserWeek.set(e.userId, perUser);
  }
  const perUserAverage: number[] = [];
  for (const perUser of daysByUserWeek.values()) {
    const counts = [...perUser.values()].map((d) => d.size);
    perUserAverage.push(counts.reduce((a, b) => a + b, 0) / counts.length);
  }
  const med = median(perUserAverage);

  const txByUser = new Map<string, TxLite[]>();
  for (const t of txs) {
    const list = txByUser.get(t.userId) ?? [];
    list.push({
      id: "",
      bookingDate: "",
      amount: 0,
      ownShare: null,
      categoryId: null,
      createdAt: t.createdAt,
      categorizedAt: t.categorizedAt,
      isInternal: t.isInternal,
    });
    txByUser.set(t.userId, list);
  }
  const streaks: Record<StreakBucket, number> = { "0": 0, "1-2": 0, "3-6": 0, "7+": 0 };
  let streakUsers = 0;
  for (const list of txByUser.values()) {
    if (!list.some((t) => !t.isInternal)) continue;
    streakUsers++;
    streaks[streakBucket(dailyStreak(list, today).days)]++;
  }

  return {
    medianActiveDays: med === null ? null : Math.round(med * 10) / 10,
    activeUsers: perUserAverage.length,
    streaks,
    streakUsers,
  };
}

// ---------------------------------------------------------------------------
// Delen
// ---------------------------------------------------------------------------

export interface ShareLite {
  userId: string;
  createdAt: string;
  status: string;
  receivedAt: string | null;
}

export interface Sharing {
  /** Actieve gebruikers (swipe in 4 weken) met minstens één deel in 4 weken. */
  usersWithShare: Ratio;
  /** Delen via de bank, minstens 14 dagen oud, afgehandeld binnen 14 dagen. */
  settledWithin14: Ratio;
  /** Gedeelde kaartjes via de bank en buiten de bank om (uit de swipe-events). */
  viaBank: number;
  outsideBank: number;
}

export function sharing(events: EventLite[], shares: ShareLite[], today: Date): Sharing {
  const now = today.getTime();
  const fourWeeksAgo = now - 4 * WEEK_MS;

  const active = new Set<string>();
  let viaBank = 0;
  let outsideBank = 0;
  for (const e of events) {
    if (e.type !== "swipe") continue;
    const method = str(e.payload, "split_method");
    if (method === "bank") viaBank++;
    else if (method === "other") outsideBank++;
    if (ms(e.createdAt) >= fourWeeksAgo) active.add(e.userId);
  }

  const sharers = new Set<string>();
  for (const s of shares) if (ms(s.createdAt) >= fourWeeksAgo && active.has(s.userId)) sharers.add(s.userId);

  let eligible = 0;
  let within = 0;
  const shareUsers = new Set<string>();
  for (const s of shares) {
    // Buiten de bank om is meteen afgehandeld bij het delen (status zonder received_at): telt hier niet.
    if (s.status === "settled_elsewhere" && s.receivedAt === null) continue;
    const created = ms(s.createdAt);
    if (now - created < 14 * DAY_MS) continue;
    eligible++;
    shareUsers.add(s.userId);
    if (s.status !== "open" && s.receivedAt !== null && ms(s.receivedAt) - created <= 14 * DAY_MS) within++;
  }

  return {
    usersWithShare: ratio(sharers.size, active.size),
    settledWithin14: ratio(within, eligible, shareUsers.size),
    viaBank,
    outsideBank,
  };
}

// ---------------------------------------------------------------------------
// Meldingen en startscherm
// ---------------------------------------------------------------------------

export interface PushTagRate extends Ratio {
  tag: string;
}

const NO_TAG = "zonder tag";

/** Per tag: geopend / verstuurd. */
export function pushOpenRate(events: EventLite[]): PushTagRate[] {
  const sent = new Map<string, number>();
  const opened = new Map<string, number>();
  const users = new Map<string, Set<string>>();
  for (const e of events) {
    if (e.type !== "push_sent" && e.type !== "push_opened") continue;
    const tag = str(e.payload, "tag") ?? NO_TAG;
    const target = e.type === "push_sent" ? sent : opened;
    target.set(tag, (target.get(tag) ?? 0) + 1);
    if (e.type === "push_sent") {
      const set = users.get(tag) ?? new Set<string>();
      set.add(e.userId);
      users.set(tag, set);
    }
  }
  return [...sent.keys()]
    .sort()
    .map((tag) => {
      const s = sent.get(tag) ?? 0;
      const o = Math.min(opened.get(tag) ?? 0, s);
      return { tag, ...ratio(o, s, users.get(tag)?.size ?? 0) };
    });
}

export interface StartTabSplit {
  opens: number;
  users: number;
  startTab: Record<"swipen" | "overzicht" | "anders", number>;
  openCards: Record<"0" | "1-5" | "6-20" | "20+", number>;
}

/** Verdeling van de starttab en het aantal open kaartjes bij openen (`app_open`). */
export function startTabSplit(events: EventLite[]): StartTabSplit {
  const result: StartTabSplit = {
    opens: 0,
    users: 0,
    startTab: { swipen: 0, overzicht: 0, anders: 0 },
    openCards: { "0": 0, "1-5": 0, "6-20": 0, "20+": 0 },
  };
  const users = new Set<string>();
  for (const e of events) {
    if (e.type !== "app_open") continue;
    result.opens++;
    users.add(e.userId);
    const tab = str(e.payload, "start_tab");
    if (tab === "swipen" || tab === "overzicht") result.startTab[tab]++;
    else result.startTab.anders++;
    const bucket = str(e.payload, "open_cards_bucket");
    if (bucket === "0" || bucket === "1-5" || bucket === "6-20" || bucket === "20+") result.openCards[bucket]++;
  }
  result.users = users.size;
  return result;
}

// ---------------------------------------------------------------------------
// Potjes
// ---------------------------------------------------------------------------

export interface PotjeCategory {
  id: string;
  userId: string;
  name: string;
  isIncome: boolean;
  systemKey: string | null;
  archived: boolean;
  monthlyBudget: number | null;
  goalAmount: number | null;
}

export interface PotjeTx {
  categoryId: string | null;
  amount: number;
  ownShare: number | null;
  isInternal: boolean;
}

export interface Potjes {
  /** Aandeel van het uitgegeven bedrag dat in Overig staat (alleen het totaal). */
  overigShare: number | null;
  /** Gebruikers met ingedeelde uitgaven (basis van `overigShare`). */
  spendUsers: number;
  /** Nieuwe potjes en hoeveel daarvan via een snelle suggestie. */
  created: number;
  suggestions: Record<string, number>;
  /** Eigen namen die minstens 2 verschillende gebruikers kozen: alleen naam en aantal. */
  sharedNames: { name: string; users: number }[];
  /** Gebruikers met minstens één potje met budget of doel. */
  withBudgetOrGoal: Ratio;
}

const OVERIG = "overig";

/** Standaardnamen (nu en uit eerdere versies) en snelle suggesties tellen niet als eigen naam. */
const KNOWN_NAMES = new Set(
  [
    ...DEFAULT_CATEGORIES.map((c) => c.name),
    ...QUICK_SUGGESTIONS.map((s) => s.name),
    "Uit eten & drinken",
    "Kleding",
    "Uitgaan",
    "Sparen",
    "Voorgeschoten",
    "Terugbetaling",
  ].map(normalizeName),
);

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("nl-NL");
}

export function potjes(categories: PotjeCategory[], txs: PotjeTx[], events: EventLite[]): Potjes {
  const byId = new Map(categories.map((c) => [c.id, c]));

  let total = 0;
  let overig = 0;
  const spendUsers = new Set<string>();
  for (const t of txs) {
    if (t.isInternal || t.amount >= 0 || !t.categoryId) continue;
    const cat = byId.get(t.categoryId);
    if (!cat || cat.isIncome || cat.systemKey) continue;
    const spend = t.ownShare ?? -t.amount;
    total += spend;
    spendUsers.add(cat.userId);
    if (normalizeName(cat.name) === OVERIG) overig += spend;
  }

  const suggestions: Record<string, number> = Object.fromEntries(QUICK_SUGGESTIONS.map((s) => [s.key, 0]));
  let created = 0;
  for (const e of events) {
    if (e.type !== "potje_created") continue;
    created++;
    const s = str(e.payload, "suggestion");
    if (s && s in suggestions) suggestions[s]++;
  }

  const names = new Map<string, { name: string; users: Set<string> }>();
  const allUsers = new Set<string>();
  const budgetUsers = new Set<string>();
  for (const c of categories) {
    if (c.systemKey) continue;
    allUsers.add(c.userId);
    if (!c.archived && (c.monthlyBudget !== null || c.goalAmount !== null)) budgetUsers.add(c.userId);
    const key = normalizeName(c.name);
    if (!key || KNOWN_NAMES.has(key)) continue;
    const entry = names.get(key) ?? { name: c.name.trim(), users: new Set<string>() };
    entry.users.add(c.userId);
    names.set(key, entry);
  }
  const sharedNames = [...names.values()]
    .filter((n) => n.users.size >= 2)
    .map((n) => ({ name: n.name, users: n.users.size }))
    .sort((a, b) => b.users - a.users || a.name.localeCompare(b.name, "nl"));

  return {
    overigShare: total > 0 ? Math.round((overig / total) * 100) : null,
    spendUsers: spendUsers.size,
    created,
    suggestions,
    sharedNames,
    withBudgetOrGoal: ratio(budgetUsers.size, allUsers.size),
  };
}

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export function connectionStats(connections: ConnectionLite[], reconnectEvents: number, today: Date): { total: number; expired: number; reconnected: number } {
  const now = today.getTime();
  let expired = 0;
  for (const c of connections) {
    if (c.status === "expired" || (c.validUntil !== null && ms(c.validUntil) < now)) expired++;
  }
  return { total: connections.length, expired, reconnected: reconnectEvents };
}

// ---------------------------------------------------------------------------
// Go / no-go (Haalbaarheid potjesapp, "De pilot moet het ritueel testen")
// ---------------------------------------------------------------------------

export type GoStatus = "go" | "grijs" | "nogo" | "te weinig data" | "niet gemeten";

/** 95%-interval (0-1). */
export interface Interval {
  low: number;
  high: number;
}

/** Wilson-scoreinterval voor een aandeel; null als `whole` 0 is. */
export function wilson(part: number, whole: number, z = 1.96): Interval | null {
  if (whole <= 0) return null;
  const p = part / whole;
  const z2 = z * z;
  const denom = 1 + z2 / whole;
  const center = (p + z2 / (2 * whole)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / whole + z2 / (4 * whole * whole))) / denom;
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
}

export interface GoNoGoRow {
  key: string;
  label: string;
  /** Aandeel (percentage), of seconden bij `unit: "seconds"`; null als niet gemeten. */
  value: Ratio | number | null;
  unit: "percent" | "seconds";
  /** 95%-interval (0-1), alleen bij aandelen. */
  interval: Interval | null;
  /** Drempels zoals in het rapport: "≥70%", "50-70%", "<50%". */
  go: string;
  grey: string;
  nogo: string;
  status: GoStatus;
  /** Kernmetric met vetorecht. */
  core?: boolean;
  /** Korte uitleg: hoe gemeten, of hoe je het buiten de app meet. */
  hint?: string;
}

export interface GoNoGo {
  rows: GoNoGoRow[];
  /** Een kernmetric staat op no-go: dan is het geheel no-go. */
  veto: boolean;
}

export interface GoNoGoInput {
  profiles: ProfileLite[];
  events: EventLite[];
  txTimings: TxTiming[];
  shares: ShareLite[];
  today: Date;
  /** Begin van het geladen eventvenster (ms). Wie eerder registreerde telt niet mee: hun events ontbreken. */
  eventsSince?: number;
}

/**
 * Status volgens de vooraf vastgelegde regel: rood alleen als ook de bovengrens van
 * het 95%-interval onder de no-go-drempel ligt; groen bij een puntschatting op of boven
 * de go-drempel; anders grijs. Bij `lowerIsBetter` precies gespiegeld.
 * Drempels als fractie (0,7 = 70%).
 */
export function ratioStatus(r: Ratio, goAt: number, nogoAt: number, lowerIsBetter = false): GoStatus {
  if (!enoughData(r.users) || r.whole === 0) return "te weinig data";
  const p = r.part / r.whole;
  const ci = wilson(r.part, r.whole) as Interval;
  if (lowerIsBetter) {
    if (ci.low > nogoAt) return "nogo";
    if (p < goAt) return "go";
    return "grijs";
  }
  if (ci.high < nogoAt) return "nogo";
  if (p >= goAt) return "go";
  return "grijs";
}

function ratioRow(
  base: Omit<GoNoGoRow, "value" | "unit" | "interval" | "status">,
  r: Ratio,
  goAt: number,
  nogoAt: number,
  lowerIsBetter = false,
): GoNoGoRow {
  return { ...base, value: r, unit: "percent", interval: wilson(r.part, r.whole), status: ratioStatus(r, goAt, nogoAt, lowerIsBetter) };
}

function notMeasured(base: Omit<GoNoGoRow, "value" | "unit" | "interval" | "status">): GoNoGoRow {
  return { ...base, value: null, unit: "percent", interval: null, status: "niet gemeten" };
}

/** Aantal (Nederlandse) kalenderdagen met een swipe in [from, to). */
function activeDays(swipes: number[], from: number, to: number): number {
  const days = new Set<string>();
  for (const t of swipes) if (t >= from && t < to) days.add(dayKey(new Date(t).toISOString()));
  return days.size;
}

/**
 * Scoort de pilot tegen de drempeltabel uit het haalbaarheidsrapport.
 * Basis is steeds de gekoppelde testers (bank_connected of bank_reconnect), behalve bij de
 * bankkoppeling zelf (alle registraties). Admins moeten al uit de rijen zijn gefilterd.
 */
export function goNoGo({ profiles, events, txTimings, shares, today, eventsSince = Number.NEGATIVE_INFINITY }: GoNoGoInput): GoNoGo {
  const now = today.getTime();
  const pilot = profiles.filter((p) => ms(p.createdAt) >= eventsSince);
  const signupAt = new Map(pilot.map((p) => [p.id, ms(p.createdAt)]));

  const linked = new Set<string>();
  const swipesByUser = new Map<string, number[]>();
  const splitUsers = new Set<string>();
  for (const e of events) {
    if (!signupAt.has(e.userId)) continue;
    if (e.type === "bank_connected" || (e.type === "bank_reconnect" && str(e.payload, "action") !== "disconnect")) linked.add(e.userId);
    if (e.type === "swipe") {
      const list = swipesByUser.get(e.userId) ?? [];
      list.push(ms(e.createdAt));
      swipesByUser.set(e.userId, list);
      const persons = e.payload?.split_persons;
      if (str(e.payload, "split_method") !== null || (typeof persons === "number" && persons > 0)) splitUsers.add(e.userId);
    }
  }
  for (const s of shares) if (signupAt.has(s.userId)) splitUsers.add(s.userId);

  const rows: GoNoGoRow[] = [];

  // 1. Bankkoppeling: registraties met een geslaagde koppeling.
  rows.push(
    ratioRow(
      { key: "bank", label: "Registraties met een geslaagde bankkoppeling", go: "≥70%", grey: "50-70%", nogo: "<50%", hint: "Basis: registraties, niet uitnodigingen." },
      ratio(linked.size, pilot.length),
      0.7,
      0.5,
    ),
  );

  // 2. Kern: gekoppelde testers die ≥80% van hun kaarten binnen 7 dagen indeelden.
  const txByUser = new Map<string, TxTiming[]>();
  for (const t of txTimings) {
    if (!t.userId || !linked.has(t.userId)) continue;
    const list = txByUser.get(t.userId) ?? [];
    list.push(t);
    txByUser.set(t.userId, list);
  }
  let sortEligible = 0;
  let sorters = 0;
  for (const list of txByUser.values()) {
    const r = labeledWithin7Days(list, today);
    if (r.eligible === 0) continue;
    sortEligible++;
    if (r.within / r.eligible >= 0.8) sorters++;
  }
  rows.push(
    ratioRow(
      {
        key: "sorted",
        label: "Gekoppelde testers die ≥80% van de kaarten binnen 7 dagen sorteren",
        go: "≥60%",
        grey: "40-60%",
        nogo: "<40%",
        core: true,
        hint: "Alleen testers met kaarten ouder dan 7 dagen.",
      },
      ratio(sorters, sortEligible),
      0.6,
      0.4,
    ),
  );

  // 3. Mediane seconden per kaart, zonder de eerste dag waarop iemand swipete.
  const firstDay = new Map<string, string>();
  for (const e of [...events].sort((a, b) => ms(a.createdAt) - ms(b.createdAt))) {
    if (e.type === "swipe" && !firstDay.has(e.userId)) firstDay.set(e.userId, dayKey(e.createdAt));
  }
  const later = timePerCard(events.filter((e) => signupAt.has(e.userId) && e.type === "swipe" && dayKey(e.createdAt) !== firstDay.get(e.userId)));
  const sec = later.medianMs === null ? null : later.medianMs / 1000;
  rows.push({
    key: "seconds",
    label: "Mediane seconden per kaart na de eerste sessie",
    value: sec,
    unit: "seconds",
    interval: null,
    go: "≤3 s",
    grey: "3-6 s",
    nogo: ">6 s",
    status: sec === null || !enoughData(later.users) ? "te weinig data" : sec <= 3 ? "go" : sec > 6 ? "nogo" : "grijs",
    hint: "Eerste sessie = eerste dag met een swipe. Puntschatting, geen interval.",
  });

  // 4. Afgebroken sessies bij een backlog van >20 kaarten (benadering).
  const completes = new Map<string, number[]>();
  for (const e of events) {
    if (e.type !== "swipe_session_complete") continue;
    const list = completes.get(e.userId) ?? [];
    list.push(ms(e.createdAt));
    completes.set(e.userId, list);
  }
  let bigSessions = 0;
  let aborted = 0;
  const bigUsers = new Set<string>();
  for (const e of events) {
    if (e.type !== "app_open" || !signupAt.has(e.userId)) continue;
    if (str(e.payload, "open_cards_bucket") !== "20+" || str(e.payload, "start_tab") !== "swipen") continue;
    bigSessions++;
    bigUsers.add(e.userId);
    const opened = ms(e.createdAt);
    const day = dayKey(e.createdAt);
    const done = (completes.get(e.userId) ?? []).some((t) => t >= opened && dayKey(new Date(t).toISOString()) === day);
    if (!done) aborted++;
  }
  rows.push(
    ratioRow(
      {
        key: "aborted",
        label: "Afgebroken sessies bij een backlog van >20 kaarten",
        go: "<30%",
        grey: "30-50%",
        nogo: ">50%",
        hint: "Benadering: geopend op Swipen met 20+ kaarten en die dag de stapel niet leeg.",
      },
      ratio(aborted, bigSessions, bigUsers.size),
      0.3,
      0.5,
      true,
    ),
  );

  // 5 en 6. Actief in week 2 en week 4: ≥3 dagen met een swipe.
  const weekActive = (week: number): Ratio => {
    let eligible = 0;
    let active = 0;
    for (const id of linked) {
      const signup = signupAt.get(id) as number;
      const from = signup + (week - 1) * WEEK_MS;
      const to = signup + week * WEEK_MS;
      if (now < to) continue;
      eligible++;
      if (activeDays(swipesByUser.get(id) ?? [], from, to) >= 3) active++;
    }
    return ratio(active, eligible);
  };
  rows.push(
    ratioRow(
      { key: "week2", label: "Actief in week 2 (≥3 dagen met een sorteeractie)", go: "≥50%", grey: "30-50%", nogo: "<30%", core: true, hint: "Dag 8-14 na registratie, gekoppelde testers." },
      weekActive(2),
      0.5,
      0.3,
    ),
  );
  rows.push(
    ratioRow(
      {
        key: "week4",
        label: "Actief in week 4 (≥3 dagen met een sorteeractie)",
        go: "≥40%",
        grey: "25-40%",
        nogo: "<25%",
        hint: "Dag 22-28 na registratie. Verwijderde accounts ontbreken. Kijk ook of de curve afvlakt.",
      },
      weekActive(4),
      0.4,
      0.25,
    ),
  );

  // 7. Opens via de melding van 20:00 per verstuurde melding.
  const evening = pushOpenRate(events.filter((e) => signupAt.has(e.userId))).find((r) => r.tag === "kaartjes") ?? { ...ratio(0, 0), tag: "kaartjes" };
  rows.push(
    ratioRow(
      { key: "push", label: "Opens via de melding van 20:00 per verstuurde melding", go: "≥25%", grey: "10-25%", nogo: "<10%", hint: "Tag kaartjes: push_opened gedeeld door push_sent." },
      evening,
      0.25,
      0.1,
    ),
  );

  // 8. iOS: niet uit de app te halen.
  rows.push(
    notMeasured({
      key: "ios",
      label: "iOS-testers met de PWA geïnstalleerd en push aan",
      go: "≥70%",
      grey: "40-70%",
      nogo: "<40%",
      hint: "De app logt geen platform. Vraag het in de enquête of check het bij het interview.",
    }),
  );

  // 9. Herkoppeling: gestart met reconnect:true, daarna een bank_reconnect.
  const reconnectStart = new Map<string, number>();
  for (const e of events) {
    if (e.type !== "bank_connect_started" || e.payload?.reconnect !== true || !signupAt.has(e.userId)) continue;
    const t = ms(e.createdAt);
    const first = reconnectStart.get(e.userId);
    if (first === undefined || t < first) reconnectStart.set(e.userId, t);
  }
  let reconnected = 0;
  for (const [id, started] of reconnectStart) {
    if (events.some((e) => e.userId === id && e.type === "bank_reconnect" && str(e.payload, "action") !== "disconnect" && ms(e.createdAt) >= started)) reconnected++;
  }
  const herkoppelBase = { key: "reconnect", label: "Gesimuleerde herkoppeling afgemaakt", go: "≥80%", grey: "60-80%", nogo: "<60%" };
  rows.push(
    reconnectStart.size === 0
      ? notMeasured({ ...herkoppelBase, hint: "Nog geen herkoppeling gestart. Laat in week 2-3 een deel van de testers opnieuw koppelen." })
      : ratioRow({ ...herkoppelBase, hint: "Testers die een herkoppeling startten en die afmaakten." }, ratio(reconnected, reconnectStart.size), 0.8, 0.6),
  );

  // 10. Sean Ellis.
  rows.push(
    notMeasured({
      key: "ellis",
      label: "Sean Ellis “zeer teleurgesteld” (n≥15)",
      go: "≥40%",
      grey: "25-40%",
      nogo: "<25%",
      hint: "Enquête aan het eind: hoe zou je je voelen als de app verdwijnt?",
    }),
  );

  // 11. Splitfunctie.
  rows.push(
    ratioRow(
      { key: "split", label: "Splitfunctie minstens 1× gebruikt", go: "≥30%", grey: "10-30%", nogo: "<10%", hint: "Bij no-go de feature heroverwegen, niet het concept." },
      ratio([...linked].filter((id) => splitUsers.has(id)).length, linked.size),
      0.3,
      0.1,
    ),
  );

  // 12. Betalingsbereidheid.
  rows.push(
    notMeasured({
      key: "pay",
      label: "Bereid te betalen €3,99/maand voor de bankkoppeling",
      go: "≥30%",
      grey: "15-30%",
      nogo: "<15%",
      hint: "Vraag het in het exitgesprek en meet het met een nepdeur.",
    }),
  );

  return { rows, veto: rows.some((r) => r.core && r.status === "nogo") };
}
