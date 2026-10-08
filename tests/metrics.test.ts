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
