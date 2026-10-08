import assert from "node:assert/strict";
import { test } from "node:test";
import { amsterdamToday, currentPeriod, previousPeriod, salaryDateInMonth } from "../lib/periods";
import { toISODate } from "../lib/format";

test("salarisdag 1 op zaterdag: periode begint 31 juli en eindigt op de volgende salarisdag", () => {
  const p = currentPeriod(1, new Date(2026, 7, 15));
  assert.equal(p.startISO, "2026-07-31");
  assert.equal(p.endISO, "2026-09-01");
  assert.equal(p.label, "sinds 31 juli");
});

test("salarisdag die naar de vorige maand schuift op de dag zelf", () => {
  // 1 augustus 2026 is een zaterdag; op 31 juli begint de nieuwe periode al.
  const p = currentPeriod(1, new Date(2026, 6, 31));
  assert.equal(p.startISO, "2026-07-31");
  assert.equal(p.endISO, "2026-09-01");
  // Op 30 juli loopt de periode van 1 juli nog, en eindigt die op 31 juli.
  const q = currentPeriod(1, new Date(2026, 6, 30));
  assert.equal(q.startISO, "2026-07-01");
  assert.equal(q.endISO, "2026-07-31");
});

test("eigenschappen voor elke salarisdag en elke dag in 2025-2027", () => {
  const first = new Date(2025, 0, 1);
  const last = new Date(2027, 11, 31);
  for (let salaryDay = 1; salaryDay <= 31; salaryDay++) {
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      const today = new Date(d);
      const todayISO = toISODate(today);
      const p = currentPeriod(salaryDay, today);
      const context = `salarisdag ${salaryDay}, vandaag ${todayISO}`;
      assert.ok(p.startISO <= todayISO, `start na vandaag: ${context} -> ${p.startISO}`);
      assert.ok(todayISO < p.endISO, `einde niet na vandaag: ${context} -> ${p.endISO}`);
      assert.ok(p.end > p.start, `leeg: ${context}`);
      assert.equal(p.startISO, toISODate(p.start));
      assert.equal(p.endISO, toISODate(p.end));
      const prev = previousPeriod(salaryDay, today);
      assert.equal(prev.endISO, p.startISO, `vorige sluit niet aan: ${context} (${prev.endISO} vs ${p.startISO})`);
      assert.ok(prev.end > prev.start, `vorige leeg: ${context}`);
    }
  }
});

test("zonder salarisdag is de periode de kalendermaand", () => {
  const p = currentPeriod(null, new Date(2026, 9, 8));
  assert.equal(p.startISO, "2026-10-01");
  assert.equal(p.endISO, "2026-11-01");
  assert.equal(p.label, "oktober");
  assert.equal(previousPeriod(null, new Date(2026, 9, 8)).startISO, "2026-09-01");
  assert.equal(currentPeriod(0, new Date(2026, 9, 8)).startISO, "2026-10-01");
});

test("salarisdag in het weekend schuift naar de werkdag ervoor", () => {
  assert.equal(toISODate(salaryDateInMonth(2026, 7, 1)), "2026-07-31"); // za 1 aug -> vr 31 jul
  assert.equal(toISODate(salaryDateInMonth(2026, 10, 1)), "2026-10-30"); // zo 1 nov -> vr 30 okt
  assert.equal(toISODate(salaryDateInMonth(2026, 1, 31)), "2026-02-27"); // 31 feb -> za 28 -> vr 27
});

test("amsterdamToday geeft de Amsterdamse kalenderdag", () => {
  // 23:30 UTC op 8 oktober is al 9 oktober in Amsterdam (zomertijd, UTC+2).
  assert.equal(toISODate(amsterdamToday(new Date("2026-10-08T23:30:00Z"))), "2026-10-09");
  // 23:30 UTC op 15 januari is 00:30 op 16 januari (wintertijd, UTC+1).
  assert.equal(toISODate(amsterdamToday(new Date("2026-01-15T23:30:00Z"))), "2026-01-16");
  assert.equal(toISODate(amsterdamToday(new Date("2026-01-15T22:30:00Z"))), "2026-01-15");
  const day = amsterdamToday(new Date("2026-06-01T12:00:00Z"));
  assert.equal(day.getHours(), 0);
  assert.equal(day.getMinutes(), 0);
});
