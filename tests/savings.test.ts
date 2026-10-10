import assert from "node:assert/strict";
import { test } from "node:test";
import { netLine, flowTitle } from "../components/insights/insight-copy";
import { savedTopLine, savingsStandText, signedWhole } from "../components/overview/overview-copy";
import { categoryKind } from "../lib/categories/types";
import { incomeAndSpendPerPeriod, recurringInput, spendSeriesPerCategory } from "../lib/insights/charts";
import {
  categoryDeviations,
  incomeOf,
  isExpenseCategory,
  savedOf,
  savedPerCategory,
  spendOf,
  spentPerCategory,
  totalIncome,
  totalSaved,
  totalSpent,
  type CatLite,
  type TxLite,
} from "../lib/insights/compute";
import { weekReview } from "../lib/insights/week";
import { currentPeriod } from "../lib/periods";

const MINUS = "−";
const NBSP = " ";

const cat = (id: string, extra: Partial<CatLite> = {}): CatLite => ({
  id,
  name: id,
  icon: "package",
  color: "grijs",
  isIncome: false,
  isSavings: false,
  systemKey: null,
  monthlyBudget: null,
  goalAmount: null,
  ...extra,
});
const cats = [cat("bood"), cat("ink", { isIncome: true }), cat("sparen", { isSavings: true, icon: "piggy-bank", goalAmount: 1000 })];
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

test("sparen is geen uitgave: spendOf geeft 0 voor een spaarpotje, erin en eruit", () => {
  assert.equal(spendOf(tx({ bookingDate: "2026-10-02", amount: -100, categoryId: "sparen" }), catMap), 0);
  assert.equal(spendOf(tx({ bookingDate: "2026-10-02", amount: 50, categoryId: "sparen" }), catMap), 0);
  // Een gewone uitgave telt gewoon.
  assert.equal(spendOf(tx({ bookingDate: "2026-10-02", amount: -30, categoryId: "bood" }), catMap), 30);
});

test("savedOf: erin is gespaard, eruit telt negatief, de rest is 0", () => {
  assert.equal(savedOf(tx({ bookingDate: "2026-10-02", amount: -100, categoryId: "sparen" }), catMap), 100);
  assert.equal(savedOf(tx({ bookingDate: "2026-10-02", amount: 40, categoryId: "sparen" }), catMap), -40);
  assert.equal(savedOf(tx({ bookingDate: "2026-10-02", amount: -30, categoryId: "bood" }), catMap), 0);
  assert.equal(savedOf(tx({ bookingDate: "2026-10-02", amount: 1800, categoryId: "ink" }), catMap), 0);
  assert.equal(savedOf(tx({ bookingDate: "2026-10-02", amount: -100 }), catMap), 0);
  assert.equal(savedOf(tx({ bookingDate: "2026-10-02", amount: -100, categoryId: "sparen", isInternal: true }), catMap), 0);
});

test("geld uit je spaarpot is nooit inkomen, ook niet als het potje per ongeluk beide vlaggen heeft", () => {
  assert.equal(incomeOf(tx({ bookingDate: "2026-10-02", amount: 200, categoryId: "sparen" }), catMap), 0);
  const both = new Map([["x", cat("x", { isIncome: true, isSavings: true })]]);
  assert.equal(incomeOf(tx({ bookingDate: "2026-10-02", amount: 200, categoryId: "x" }), both), 0);
  assert.equal(spendOf(tx({ bookingDate: "2026-10-02", amount: -200, categoryId: "x" }), both), 0);
});

test("totalen: uitgegeven zonder sparen, gespaard netto, stand over alles", () => {
  const txs = [
    tx({ bookingDate: "2026-08-03", amount: -500, categoryId: "sparen" }),
    tx({ bookingDate: "2026-10-01", amount: 1800, categoryId: "ink" }),
    tx({ bookingDate: "2026-10-02", amount: -300, categoryId: "sparen" }),
    tx({ bookingDate: "2026-10-05", amount: 100, categoryId: "sparen" }),
    tx({ bookingDate: "2026-10-06", amount: -60, categoryId: "bood" }),
  ];
  assert.equal(totalSpent(txs, catMap, "2026-10-01", "2026-11-01"), 60);
  assert.equal(totalIncome(txs, catMap, "2026-10-01", "2026-11-01"), 1800);
  // Erin en eruit in dezelfde maand tellen netto.
  assert.equal(totalSaved(txs, catMap, "2026-10-01", "2026-11-01"), 200);
  assert.equal(spentPerCategory(txs, catMap, "2026-10-01", "2026-11-01").has("sparen"), false);
  assert.equal(savedPerCategory(txs, catMap).get("sparen"), 700);
  assert.equal(savedPerCategory(txs, catMap, "", "2026-10-01").get("sparen"), 500);
  // Meer eruit dan erin: negatief, geen inkomen.
  const out = [tx({ bookingDate: "2026-10-03", amount: 200, categoryId: "sparen" })];
  assert.equal(totalSaved(out, catMap, "2026-10-01", "2026-11-01"), -200);
  assert.equal(totalIncome(out, catMap, "2026-10-01", "2026-11-01"), 0);
});

test("spaarpotjes vallen uit de uitgavelijsten: afwijkingen, potjesreeks en weekterugblik", () => {
  assert.equal(isExpenseCategory(catMap.get("sparen")!), false);
  assert.equal(isExpenseCategory(catMap.get("bood")!), true);
  const today = new Date(2026, 9, 11); // zondag
  const txs = [
    tx({ bookingDate: "2026-10-06", amount: -300, categoryId: "sparen" }),
    tx({ bookingDate: "2026-10-07", amount: -40, categoryId: "bood" }),
  ];
  assert.deepEqual(
    categoryDeviations(txs, catMap, 1, today).map((d) => d.categoryId),
    ["bood"],
  );
  const period = currentPeriod(1, today);
  assert.deepEqual(
    spendSeriesPerCategory(txs, catMap, [period]).map((s) => s.id),
    ["bood"],
  );
  assert.deepEqual(weekReview(txs, catMap, today)?.rows.map((r) => r.categoryId), ["bood"]);
});

test("in en uit per maand: gespaard apart, over = inkomsten − uitgaven − gespaard", () => {
  const today = new Date(2026, 9, 20);
  const period = currentPeriod(1, today);
  const txs = [
    tx({ bookingDate: "2026-10-01", amount: 2000, categoryId: "ink" }),
    tx({ bookingDate: "2026-10-02", amount: -300, categoryId: "sparen" }),
    tx({ bookingDate: "2026-10-03", amount: -1200, categoryId: "bood" }),
  ];
  const [flow] = incomeAndSpendPerPeriod(txs, catMap, [period], today);
  assert.equal(flow.income, 2000);
  assert.equal(flow.spent, 1200);
  assert.equal(flow.saved, 300);
  assert.equal(flow.net, 500);
});

test("vaste lasten op Meer inzicht zonder spaaroverboekingen; voor Vrij tot je salaris wel", () => {
  assert.equal(recurringInput([], cats).systemIds.has("sparen"), false);
  assert.equal(recurringInput([], cats, { withoutSavings: true }).systemIds.has("sparen"), true);
});

test("een potje is inkomen óf sparen, nooit allebei", () => {
  assert.deepEqual(categoryKind({ isIncome: false, isSavings: true }), { is_income: false, is_savings: true });
  assert.deepEqual(categoryKind({ isIncome: true, isSavings: false }), { is_income: true, is_savings: false });
  assert.equal(categoryKind({ isIncome: true, isSavings: true }), null);
  // Zonder isSavings blijft sparen ongewijzigd, behalve als het potje inkomen wordt.
  assert.deepEqual(categoryKind({ isIncome: false }), { is_income: false });
  assert.deepEqual(categoryKind({ isIncome: true }), { is_income: true, is_savings: false });
});

test("teksten over sparen: neutraal, met teken, en eerlijk over een negatieve stand", () => {
  assert.equal(savedTopLine(100), `Gespaard deze maand: €${NBSP}100`);
  assert.equal(savedTopLine(-200), `€${NBSP}200 uit je spaarpot gehaald`);
  assert.equal(savedTopLine(0.3), null);
  assert.equal(savedTopLine(80, "in september"), `Gespaard in september: €${NBSP}80`);
  assert.equal(signedWhole(150), `+${NBSP}€${NBSP}150`);
  assert.equal(signedWhole(-200), `${MINUS}${NBSP}€${NBSP}200`);
  assert.equal(signedWhole(0.4), null);
  assert.equal(savingsStandText(1240), `Er zit €${NBSP}1.240 in`);
  assert.equal(savingsStandText(-50), `€${NBSP}50 meer eruit dan erin`);
});

test("wat er over is noemt het sparen", () => {
  assert.equal(netLine(130, 100), `Inkomsten ${MINUS} uitgaven ${MINUS} gespaard: €${NBSP}130 over`);
  assert.equal(netLine(-40, 100), `€${NBSP}40 meer uitgegeven en gespaard dan binnenkwam`);
  assert.equal(netLine(30, -200), `Inkomsten ${MINUS} uitgaven + uit je spaarpot: €${NBSP}30 over`);
  assert.equal(netLine(230), `Inkomsten ${MINUS} uitgaven: €${NBSP}230 over`);
  assert.equal(
    flowTitle({ income: 1800, spent: 1700, saved: 300, net: -200, periods: 2 }, 0),
    `Gemiddeld geef en spaar je €${NBSP}200 per maand meer dan er binnenkomt`,
  );
});
