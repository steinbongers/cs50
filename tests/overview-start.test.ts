import assert from "node:assert/strict";
import { test } from "node:test";
import { overviewStartsOn } from "../lib/insights/overview-start";

const period = { startISO: "2026-10-20", endISO: "2026-11-20" };

test("overzicht: halverwege de maand begonnen, dan pas op de volgende salarisdag", () => {
  assert.equal(overviewStartsOn("2026-11-11", period), "2026-11-20");
  assert.equal(overviewStartsOn("2026-10-21", period), "2026-11-20");
});

test("overzicht: de maand is compleet, dus meteen tonen", () => {
  assert.equal(overviewStartsOn("2026-10-20", period), null);
  assert.equal(overviewStartsOn("2026-08-01", period), null);
});

test("overzicht: op de salarisdag zelf is de nieuwe maand compleet", () => {
  assert.equal(overviewStartsOn("2026-11-11", { startISO: "2026-11-20", endISO: "2026-12-18" }), null);
});

test("overzicht: nog geen betalingen, dan de gewone lege staat", () => {
  assert.equal(overviewStartsOn(null, period), null);
});
