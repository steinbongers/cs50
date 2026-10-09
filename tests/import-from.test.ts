import assert from "node:assert/strict";
import { test } from "node:test";
import { importFromDate, isImportFrom } from "../lib/bank/import-from";

test("kaartjes ophalen vanaf: vandaag, salaris, 30 en 90 dagen", () => {
  const today = new Date(2026, 9, 10); // 10 oktober 2026
  assert.equal(importFromDate("nu", 25, today), "2026-10-10");
  assert.equal(importFromDate("30", 25, today), "2026-09-10");
  assert.equal(importFromDate("90", 25, today), "2026-07-12");
  assert.equal(importFromDate("periode", null, today), "2026-10-01");
  assert.ok(isImportFrom("90"));
  assert.ok(!isImportFrom("365"));
});
