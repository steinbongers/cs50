import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_SPLIT_PARTS,
  SPLIT_NOTE_MAX,
  centsToInput,
  checkSplitParts,
  fillRestCents,
  remainingCents,
  splitNote,
  splitPartLine,
  splitSummary,
  toCents,
} from "../lib/transactions/split-parts";

const part = (categoryId: string, amount: number, note?: string | null) => ({ categoryId, amount, note });

test("verdelen: centen zonder afrondfouten", () => {
  assert.equal(toCents(-450), 45000);
  assert.equal(toCents(0.1 + 0.2), 30);
  assert.equal(toCents(19.99), 1999);
  assert.equal(remainingCents(45000, [12050, 30000]), 2950);
  assert.equal(remainingCents(1000, [600, 500]), -100);
  assert.equal(centsToInput(2950), "29,50");
  assert.equal(centsToInput(2905), "29,05");
  assert.equal(centsToInput(45000), "450");
  assert.equal(centsToInput(7), "0,07");
});

test("verdelen: Rest vult precies wat overblijft", () => {
  assert.equal(fillRestCents(45000, [12050, 30000]), 2950);
  assert.equal(fillRestCents(45000, []), 45000);
  // Al alles verdeeld of te veel: niets meer over voor deze regel.
  assert.equal(fillRestCents(45000, [45000]), 0);
  assert.equal(fillRestCents(45000, [30000, 20000]), 0);
  // Rest plus de andere regels is altijd het hele bedrag (als er iets over is).
  const others = [3333, 3333];
  assert.equal(remainingCents(10000, [...others, fillRestCents(10000, others)]), 0);
});

test("verdelen: de delen tellen in centen precies op", () => {
  const ok = checkSplitParts(-450, [part("a", 120.5), part("b", 300), part("c", 29.5, "  fooi  ")]);
  assert.deepEqual(ok, {
    ok: true,
    parts: [
      { categoryId: "a", cents: 12050, note: null },
      { categoryId: "b", cents: 30000, note: null },
      { categoryId: "c", cents: 2950, note: "fooi" },
    ],
  });
  // 0,1 + 0,2 is in floats geen 0,3; in centen wel.
  assert.equal(checkSplitParts(-0.3, [part("a", 0.1), part("b", 0.2)]).ok, true);
  // Inkomend geld kan ook (het teken volgt de afschrijving).
  assert.equal(checkSplitParts(80, [part("a", 50), part("b", 30)]).ok, true);
  assert.deepEqual(checkSplitParts(-450, [part("a", 120.5), part("b", 300)]), { ok: false, reason: "sum" });
  assert.deepEqual(checkSplitParts(-450, [part("a", 150), part("b", 300.01)]), { ok: false, reason: "sum" });
});

test("verdelen: ongeldige delen", () => {
  assert.deepEqual(checkSplitParts(-100, [part("a", 100)]), { ok: false, reason: "count" });
  assert.deepEqual(checkSplitParts(-100, []), { ok: false, reason: "count" });
  assert.deepEqual(checkSplitParts(-100, "a"), { ok: false, reason: "count" });
  const many = Array.from({ length: MAX_SPLIT_PARTS + 1 }, (_, i) => part(`p${i}`, 1));
  assert.deepEqual(checkSplitParts(-(MAX_SPLIT_PARTS + 1), many), { ok: false, reason: "count" });
  assert.deepEqual(checkSplitParts(-100, [part("a", 100), part("b", 0)]), { ok: false, reason: "amount" });
  assert.deepEqual(checkSplitParts(-100, [part("a", 101), part("b", -1)]), { ok: false, reason: "amount" });
  assert.deepEqual(checkSplitParts(-100, [part("a", 50.005), part("b", 49.995)]), { ok: false, reason: "amount" });
  assert.deepEqual(checkSplitParts(-100, [part("a", Number.NaN), part("b", 100)]), { ok: false, reason: "amount" });
  assert.deepEqual(checkSplitParts(-100, [part("a", 50), part("a", 50)]), { ok: false, reason: "duplicate" });
  assert.deepEqual(checkSplitParts(0, [part("a", 50), part("b", 50)]), { ok: false, reason: "amount" });
});

test("verdelen: notitie en teksten", () => {
  assert.equal(splitNote("  boodschappen   en  jas "), "boodschappen en jas");
  assert.equal(splitNote("   "), null);
  assert.equal(splitNote(12), null);
  assert.equal(splitNote("x".repeat(SPLIT_NOTE_MAX + 10))?.length, SPLIT_NOTE_MAX);
  assert.equal(splitSummary(3), "Verdeeld over 3 potjes");
  assert.equal(splitPartLine("ICS Creditcard", -450), "Deel van ICS Creditcard (€ 450,00)");
});
