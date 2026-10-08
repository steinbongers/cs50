import assert from "node:assert/strict";
import { test } from "node:test";
import { cohortRetention, labeledWithin7Days, swipeStats, weeklyActiveUsers, type EventLite } from "../lib/admin/metrics";

const today = new Date(2026, 9, 8, 12); // donderdag 8 oktober 2026

const ev = (userId: string, type: string, createdAt: string, durationMs: number | null = null): EventLite => ({ userId, type, createdAt, durationMs });

test("actieve gebruikers per week tellen unieke swipers", () => {
  const events = [ev("a", "swipe", "2026-10-06T10:00:00Z"), ev("a", "swipe", "2026-10-07T10:00:00Z"), ev("b", "swipe", "2026-10-06T10:00:00Z"), ev("c", "undo", "2026-10-06T10:00:00Z")];
  const weeks = weeklyActiveUsers(events, today, 2);
  assert.equal(weeks.length, 2);
  assert.equal(weeks[1].weekStart, "2026-10-05");
  assert.equal(weeks[1].activeUsers, 2);
  assert.equal(weeks[0].activeUsers, 0);
});

test("retentie per cohort: alleen afgeronde weken, percentage actief", () => {
  const profiles = [
    { id: "a", createdAt: "2026-09-01T10:00:00Z" },
    { id: "b", createdAt: "2026-09-02T10:00:00Z" },
  ];
  const events = [
    ev("a", "swipe", "2026-09-03T10:00:00Z"), // week 1
    ev("a", "swipe", "2026-09-10T10:00:00Z"), // week 2
    ev("b", "swipe", "2026-09-03T10:00:00Z"), // week 1
  ];
  const [cohort] = cohortRetention(profiles, events, today);
  assert.equal(cohort.size, 2);
  assert.equal(cohort.retention[1], 100);
  assert.equal(cohort.retention[2], 50);
  assert.equal(cohort.retention[4], 0);
  assert.equal(cohort.retention[8], null); // 8 weken nog niet voorbij
});

test("binnen 7 dagen gelabeld", () => {
  const txs = [
    { createdAt: "2026-09-20T10:00:00Z", categorizedAt: "2026-09-21T10:00:00Z", isInternal: false },
    { createdAt: "2026-09-20T10:00:00Z", categorizedAt: "2026-09-30T10:00:00Z", isInternal: false },
    { createdAt: "2026-09-20T10:00:00Z", categorizedAt: null, isInternal: false },
    { createdAt: "2026-10-07T10:00:00Z", categorizedAt: null, isInternal: false }, // te jong
    { createdAt: "2026-09-20T10:00:00Z", categorizedAt: null, isInternal: true }, // telt niet
  ];
  const r = labeledWithin7Days(txs, today);
  assert.equal(r.eligible, 3);
  assert.equal(r.percentage, 33);
});

test("swipe-statistieken: gemiddelde duur en undo-percentage", () => {
  const events = [ev("a", "swipe", "2026-10-01T00:00:00Z", 2000), ev("a", "swipe", "2026-10-01T00:00:00Z", 4000), ev("a", "undo", "2026-10-01T00:00:00Z")];
  const s = swipeStats(events);
  assert.equal(s.swipes, 2);
  assert.equal(s.averageMs, 3000);
  assert.equal(s.undos, 1);
  assert.equal(s.undoRate, 50);
});

// ---------------------------------------------------------------------------
// Afwerkronde: mediaan, noordsterren, trechter, gewoonte, delen, meldingen, potjes
// ---------------------------------------------------------------------------

import {
  activation,
  biggestDrop,
  excludeAdmins,
  funnel,
  habit,
  laterRatio,
  median,
  overallRetention,
  percentile,
  potjes,
  pushOpenRate,
  ratio,
  sharing,
  startTabSplit,
  streakBucket,
  timePerCard,
  tooLittleData,
  undoRate,
} from "../lib/admin/metrics";

const evp = (userId: string, type: string, createdAt: string, payload: Record<string, unknown> = {}, durationMs: number | null = null): EventLite => ({
  userId,
  type,
  createdAt,
  durationMs,
  payload,
});

test("mediaan en percentiel", () => {
  assert.equal(median([]), null);
  assert.equal(median([3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(percentile([1, 2, 3, 4, 5], 75), 4);
  assert.equal(percentile([1, 2, 3, 4], 75), 3.25);
  assert.equal(percentile([1, 2, 3, 4], 0), 1);
  assert.equal(percentile([1, 2, 3, 4], 100), 4);
});

test("ratio en te weinig data", () => {
  assert.deepEqual(ratio(7, 9), { part: 7, whole: 9, percentage: 78, users: 9 });
  assert.equal(ratio(0, 0).percentage, null);
  assert.equal(tooLittleData(3), "Nog te weinig data (3 gebruikers)");
  assert.equal(tooLittleData(1), "Nog te weinig data (1 gebruiker)");
});

test("admins tellen nergens mee", () => {
  const rows = [{ id: "a" }, { id: "admin" }];
  assert.deepEqual(excludeAdmins(rows, new Set(["admin"]), (r) => r.id), [{ id: "a" }]);
});

test("activatie: onboarding, bank en 10 swipes binnen 72 uur", () => {
  const signup = "2026-10-01T10:00:00Z";
  const swipes = (user: string, count: number, at: string) => Array.from({ length: count }, () => evp(user, "swipe", at));
  const profiles = [
    { id: "a", createdAt: signup, onboardingDone: true }, // geactiveerd
    { id: "b", createdAt: signup, onboardingDone: true }, // te weinig swipes
    { id: "c", createdAt: signup, onboardingDone: true }, // swipes na 72 uur
    { id: "d", createdAt: signup, onboardingDone: false }, // onboarding niet af
    { id: "e", createdAt: "2026-10-07T10:00:00Z", onboardingDone: true }, // nog geen 72 uur binnen
  ];
  const events = [
    evp("a", "bank_connected", "2026-10-01T11:00:00Z"),
    ...swipes("a", 10, "2026-10-02T10:00:00Z"),
    evp("b", "bank_connected", "2026-10-01T11:00:00Z"),
    ...swipes("b", 9, "2026-10-02T10:00:00Z"),
    evp("c", "bank_connected", "2026-10-01T11:00:00Z"),
    ...swipes("c", 12, "2026-10-05T10:00:00Z"),
    evp("d", "bank_connected", "2026-10-01T11:00:00Z"),
    ...swipes("d", 12, "2026-10-02T10:00:00Z"),
  ];
  const r = activation(profiles, events, today);
  assert.equal(r.whole, 4);
  assert.equal(r.part, 1);
  assert.equal(r.percentage, 25);
});

test("trechter telt unieke gebruikers per stap en vindt de grootste uitval", () => {
  const profiles = ["a", "b", "c", "d"].map((id) => ({ id, createdAt: "2026-10-01T00:00:00Z" }));
  const t = "2026-10-01T10:00:00Z";
  const events = [
    ...["a", "b", "c", "d"].map((u) => evp(u, "signup_completed", t)),
    ...["a", "b", "c", "d"].map((u) => evp(u, "onboarding_step_done", t, { step: "potjes" })),
    evp("a", "onboarding_step_done", t, { step: "potjes" }), // dubbel telt één keer
    ...["a", "b", "c"].map((u) => evp(u, "onboarding_step_done", t, { step: "salarisdag" })),
    ...["a", "b", "c"].map((u) => evp(u, "bank_connect_started", t)),
    evp("a", "bank_connected", t),
    evp("a", "coach_completed", t),
    evp("admin", "signup_completed", t), // geen bekend profiel
  ];
  const f = funnel(events, profiles);
  assert.deepEqual(
    f.steps.map((s) => s.count),
    [4, 4, 3, 3, 1, 1],
  );
  assert.equal(f.biggestDrop?.step.key, "bank_connected");
  assert.equal(f.biggestDrop?.step.dropLabel, "bank koppelen");
  assert.equal(f.biggestDrop?.lost, 2);
  assert.equal(f.biggestDrop?.of, 3);
  assert.equal(biggestDrop([]), null);
});

test("tijd per kaart: mediaan en p75 zonder coach en terugbetalingen", () => {
  const t = "2026-10-01T10:00:00Z";
  const events = [
    evp("a", "swipe", t, { coach: false, flow: "normal" }, 1000),
    evp("a", "swipe", t, { coach: false, flow: "normal" }, 2000),
    evp("b", "swipe", t, { coach: false, flow: "normal" }, 3000),
    evp("b", "swipe", t, { coach: false, flow: "normal" }, 10000),
    evp("a", "swipe", t, { coach: true, flow: "normal" }, 60000), // coach
    evp("a", "swipe", t, { coach: false, flow: "repayment" }, 60000), // terugbetaling
    evp("a", "swipe", t, {}, null), // geen duur
  ];
  const r = timePerCard(events);
  assert.equal(r.cards, 4);
  assert.equal(r.users, 2);
  assert.equal(r.medianMs, 2500);
  assert.equal(r.p75Ms, 4750);
});

test("Later per swipe en undo-percentage", () => {
  const t = "2026-10-01T10:00:00Z";
  const events = [evp("a", "swipe", t), evp("a", "swipe", t), evp("a", "swipe", t), evp("a", "swipe", t), evp("a", "skip", t), evp("b", "undo", t)];
  const later = laterRatio(events);
  assert.equal(later.part, 1);
  assert.equal(later.whole, 4);
  assert.equal(later.percentage, 25);
  const undo = undoRate(events);
  assert.equal(undo.part, 1);
  assert.equal(undo.users, 2);
});

test("gewoonte: mediaan actieve dagen per week en streakverdeling", () => {
  // a: 3 dagen in de laatste week; b: 1 dag in de laatste week en 3 dagen een week eerder (gemiddeld 2).
  const events = [
    evp("a", "swipe", "2026-10-07T08:00:00Z"),
    evp("a", "swipe", "2026-10-07T09:00:00Z"),
    evp("a", "swipe", "2026-10-06T09:00:00Z"),
    evp("a", "swipe", "2026-10-05T09:00:00Z"),
    evp("b", "swipe", "2026-10-07T09:00:00Z"),
    evp("b", "swipe", "2026-09-30T09:00:00Z"),
    evp("b", "swipe", "2026-09-29T09:00:00Z"),
    evp("b", "swipe", "2026-09-28T09:00:00Z"),
    evp("c", "swipe", "2026-08-01T09:00:00Z"), // buiten het venster
  ];
  const txs = [
    // a: alles meteen ingedeeld sinds 1 oktober: streak 7
    { userId: "a", createdAt: "2026-10-01T08:00:00Z", categorizedAt: "2026-10-01T09:00:00Z", isInternal: false },
    // b: kaartje staat open: streak 0
    { userId: "b", createdAt: "2026-10-05T08:00:00Z", categorizedAt: null, isInternal: false },
  ];
  const h = habit(events, txs, today);
  assert.equal(h.activeUsers, 2);
  assert.equal(h.medianActiveDays, 2.5);
  assert.equal(h.streakUsers, 2);
  assert.equal(h.streaks["7+"], 1);
  assert.equal(h.streaks["0"], 1);
  assert.equal(streakBucket(2), "1-2");
  assert.equal(streakBucket(3), "3-6");
});

test("delen: actieve deelnemers, binnen 14 dagen afgehandeld, via de bank of niet", () => {
  const events = [
    evp("a", "swipe", "2026-10-01T10:00:00Z", { split_method: "bank" }),
    evp("b", "swipe", "2026-10-01T10:00:00Z", { split_method: "other" }),
    evp("c", "swipe", "2026-10-01T10:00:00Z", { split_method: null }),
    evp("d", "swipe", "2026-08-01T10:00:00Z"), // niet actief in 4 weken
  ];
  const shares = [
    { userId: "a", createdAt: "2026-10-01T10:00:00Z", status: "open", receivedAt: null }, // te jong voor 14 dagen
    { userId: "a", createdAt: "2026-09-01T10:00:00Z", status: "received", receivedAt: "2026-09-05T10:00:00Z" }, // binnen 14 dagen
    { userId: "b", createdAt: "2026-09-01T10:00:00Z", status: "open", receivedAt: null }, // nog open
    { userId: "b", createdAt: "2026-10-01T10:00:00Z", status: "settled_elsewhere", receivedAt: null }, // buiten de bank, telt niet
    { userId: "d", createdAt: "2026-09-01T10:00:00Z", status: "settled_elsewhere", receivedAt: "2026-09-30T10:00:00Z" }, // na 29 dagen
  ];
  const s = sharing(events, shares, today);
  assert.equal(s.usersWithShare.whole, 3);
  assert.equal(s.usersWithShare.part, 2);
  assert.equal(s.settledWithin14.whole, 3);
  assert.equal(s.settledWithin14.part, 1);
  assert.equal(s.viaBank, 1);
  assert.equal(s.outsideBank, 1);
});

test("meldingen: geopend per tag", () => {
  const t = "2026-10-01T10:00:00Z";
  const events = [
    evp("a", "push_sent", t, { tag: "kaartjes" }),
    evp("b", "push_sent", t, { tag: "kaartjes" }),
    evp("a", "push_sent", t, { tag: "kaartjes" }),
    evp("a", "push_sent", t, { tag: "kaartjes" }),
    evp("a", "push_opened", t, { tag: "kaartjes" }),
    evp("a", "push_sent", t, { tag: "jouw-maand" }),
  ];
  const rates = pushOpenRate(events);
  assert.deepEqual(
    rates.map((r) => [r.tag, r.part, r.whole, r.percentage, r.users]),
    [
      ["jouw-maand", 0, 1, 0, 1],
      ["kaartjes", 1, 4, 25, 2],
    ],
  );
});

test("startscherm: verdeling van starttab en open kaartjes", () => {
  const t = "2026-10-01T10:00:00Z";
  const s = startTabSplit([
    evp("a", "app_open", t, { start_tab: "swipen", open_cards_bucket: "1-5" }),
    evp("a", "app_open", t, { start_tab: "overzicht", open_cards_bucket: "0" }),
    evp("b", "app_open", t, { start_tab: "swipen", open_cards_bucket: "20+" }),
    evp("b", "swipe", t),
  ]);
  assert.equal(s.opens, 3);
  assert.equal(s.users, 2);
  assert.deepEqual(s.startTab, { swipen: 2, overzicht: 1, anders: 0 });
  assert.equal(s.openCards["1-5"], 1);
  assert.equal(s.openCards["20+"], 1);
});

test("potjes: Overig-aandeel, suggesties, gedeelde eigen namen en budget of doel", () => {
  const cat = (id: string, userId: string, name: string, extra: Partial<{ monthlyBudget: number; goalAmount: number; systemKey: string; isIncome: boolean; archived: boolean }> = {}) => ({
    id,
    userId,
    name,
    isIncome: extra.isIncome ?? false,
    systemKey: extra.systemKey ?? null,
    archived: extra.archived ?? false,
    monthlyBudget: extra.monthlyBudget ?? null,
    goalAmount: extra.goalAmount ?? null,
  });
  const categories = [
    cat("a-boodschappen", "a", "Boodschappen", { monthlyBudget: 300 }),
    cat("a-overig", "a", "Overig"),
    cat("a-sport", "a", "Sport"),
    cat("b-sport", "b", " sport "),
    cat("b-overig", "b", "Overig"),
    cat("c-hobby", "c", "Hobby", { goalAmount: 500 }),
    cat("c-studie", "c", "Studie"),
    cat("d-studie", "d", "Studie"),
    cat("a-voor", "a", "Voorgeschoten", { systemKey: "voorgeschoten" }),
    cat("a-inkomen", "a", "Inkomen", { isIncome: true }),
  ];
  const txs = [
    { categoryId: "a-boodschappen", amount: -60, ownShare: null, isInternal: false },
    { categoryId: "a-overig", amount: -40, ownShare: 20, isInternal: false }, // eigen deel telt
    { categoryId: "b-overig", amount: -10, ownShare: null, isInternal: false },
    { categoryId: "a-sport", amount: -10, ownShare: null, isInternal: false },
    { categoryId: "a-voor", amount: -100, ownShare: null, isInternal: false }, // telt niet
    { categoryId: "a-inkomen", amount: 2000, ownShare: null, isInternal: false }, // telt niet
    { categoryId: "a-overig", amount: -500, ownShare: null, isInternal: true }, // eigen overboeking
  ];
  const events = [
    evp("c", "potje_created", "2026-10-01T10:00:00Z", { suggestion: "studie" }),
    evp("d", "potje_created", "2026-10-01T10:00:00Z", { suggestion: "studie" }),
    evp("a", "potje_created", "2026-10-01T10:00:00Z", { suggestion: null }),
  ];
  const p = potjes(categories, txs, events);
  assert.equal(p.overigShare, 30); // 30 van 100
  assert.equal(p.spendUsers, 2);
  assert.equal(p.created, 3);
  assert.equal(p.suggestions.studie, 2);
  assert.equal(p.suggestions.huisdier, 0);
  assert.deepEqual(p.sharedNames, [{ name: "Sport", users: 2 }]); // Studie is een suggestie, Hobby maar 1 keer
  assert.equal(p.withBudgetOrGoal.part, 2);
  assert.equal(p.withBudgetOrGoal.whole, 4);
});

test("retentie: churn telt mee in de cohort, kleine cohorten grijs, W4 over alles", () => {
  const profiles = [
    { id: "a", createdAt: "2026-08-03T10:00:00Z" },
    { id: "b", createdAt: "2026-08-04T10:00:00Z" },
  ];
  const events = [ev("a", "swipe", "2026-08-26T10:00:00Z"), ev("b", "swipe", "2026-08-27T10:00:00Z")]; // allebei in week 4
  // Verwijderd na 5 dagen, in dezelfde cohort.
  const churn = [{ cohortWeek: "2026-08-03", daysSinceSignup: 5, createdAt: "2026-08-08T10:00:00Z" }];
  const cohorts = cohortRetention(profiles, events, today, churn);
  assert.equal(cohorts.length, 1);
  const [c] = cohorts;
  assert.equal(c.size, 3);
  assert.equal(c.churned, 1);
  assert.equal(c.small, false);
  assert.deepEqual(c.counts[4], { active: 2, eligible: 3 });
  assert.equal(c.retention[4], 67);
  assert.deepEqual(c.counts[1], { active: 0, eligible: 2 }); // week 1: verwijderde nog aanwezig, onbekend
  const w4 = overallRetention(cohorts, 4);
  assert.equal(w4.part, 2);
  assert.equal(w4.whole, 3);

  const small = cohortRetention([{ id: "z", createdAt: "2026-09-01T10:00:00Z" }], [], today);
  assert.equal(small[0].small, true);
});
