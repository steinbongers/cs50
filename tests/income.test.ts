import assert from "node:assert/strict";
import { test } from "node:test";
import { incomeOf, incomePerCategory, spendOf, totalIncome, type CatLite, type TxLite } from "../lib/insights/compute";

const cats: CatLite[] = [
  { id: "bood", name: "Boodschappen", icon: "shopping-cart", color: "groen", isIncome: false, systemKey: null, monthlyBudget: null, goalAmount: null },
  { id: "ink", name: "Inkomen", icon: "banknote", color: "groen", isIncome: true, systemKey: null, monthlyBudget: null, goalAmount: null },
  { id: "toe", name: "Toeslagen", icon: "landmark", color: "mint", isIncome: true, systemKey: null, monthlyBudget: null, goalAmount: null },
  { id: "vg", name: "Voorgeschoten", icon: "hand-coins", color: "geel", isIncome: false, systemKey: "voorgeschoten", monthlyBudget: null, goalAmount: null },
  { id: "terug", name: "Geld terug", icon: "receipt", color: "blauw", isIncome: false, systemKey: "terug", monthlyBudget: null, goalAmount: null },
];
const catMap = new Map(cats.map((c) => [c.id, c]));

const tx = (p: Partial<TxLite> & { bookingDate: string; amount: number }): TxLite => ({
  id: Math.random().toString(36).slice(2),
  ownShare: null,
  categoryId: null,
  createdAt: `${p.bookingDate}T10:00:00.000Z`,
  categorizedAt: `${p.bookingDate}T12:00:00.000Z`,
  isInternal: false,
  ...p,
});

test("inkomen telt alleen geld in een inkomstenpotje", () => {
  assert.equal(incomeOf(tx({ bookingDate: "2026-10-01", amount: 1850, categoryId: "ink" }), catMap), 1850);
  assert.equal(incomeOf(tx({ bookingDate: "2026-10-01", amount: 120, categoryId: "toe" }), catMap), 120);
});

test("geld terug, voorgeschoten en terugbetalingen in een uitgavepotje zijn geen inkomen", () => {
  assert.equal(incomeOf(tx({ bookingDate: "2026-10-01", amount: 20, categoryId: "terug" }), catMap), 0);
  assert.equal(incomeOf(tx({ bookingDate: "2026-10-01", amount: 30, categoryId: "vg" }), catMap), 0);
  const refund = tx({ bookingDate: "2026-10-01", amount: 10, categoryId: "bood" });
  assert.equal(incomeOf(refund, catMap), 0);
  // Diezelfde terugbetaling verlaagt wel de uitgaven.
  assert.equal(spendOf(refund, catMap), -10);
});

test("eigen overboekingen, inkomend geld zonder potje en onbekende potjes zijn geen inkomen", () => {
  assert.equal(incomeOf(tx({ bookingDate: "2026-10-01", amount: 500, categoryId: "ink", isInternal: true }), catMap), 0);
  assert.equal(incomeOf(tx({ bookingDate: "2026-10-01", amount: 500 }), catMap), 0);
  assert.equal(incomeOf(tx({ bookingDate: "2026-10-01", amount: 500, categoryId: "weg" }), catMap), 0);
});

test("een afschrijving in een inkomstenpotje gaat van het inkomen af, totaal nooit negatief", () => {
  const txs = [
    tx({ bookingDate: "2026-10-01", amount: 1850, categoryId: "ink" }),
    tx({ bookingDate: "2026-10-03", amount: -50, categoryId: "ink" }),
    tx({ bookingDate: "2026-10-04", amount: 120, categoryId: "toe" }),
    tx({ bookingDate: "2026-10-05", amount: 40, categoryId: "terug" }),
    tx({ bookingDate: "2026-11-01", amount: 1900, categoryId: "ink" }), // volgende periode
  ];
  assert.equal(totalIncome(txs, catMap, "2026-10-01", "2026-11-01"), 1920);
  const per = incomePerCategory(txs, catMap, "2026-10-01", "2026-11-01");
  assert.equal(per.get("ink"), 1800);
  assert.equal(per.get("toe"), 120);
  assert.equal(per.has("terug"), false);
  assert.equal(totalIncome([tx({ bookingDate: "2026-10-03", amount: -50, categoryId: "ink" })], catMap, "2026-10-01", "2026-11-01"), 0);
});
