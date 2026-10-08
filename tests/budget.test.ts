import assert from "node:assert/strict";
import { test } from "node:test";
import { budgetLabel, budgetStatus, goalLabel, goalStatus } from "../lib/insights/budget";

// Intl gebruikt een vaste spatie tussen € en bedrag; voor de leesbaarheid normaliseren.
const plain = (text: string) => text.replace(/ /g, " ");

test("budget: binnen het budget", () => {
  const s = budgetStatus(112, 200);
  assert.deepEqual(s, { ratio: 0.56, left: 88, over: 0, state: "ok" });
  assert.equal(plain(budgetLabel(s)), "Nog € 88");
});

test("budget: erover, balk vol", () => {
  const s = budgetStatus(214, 200);
  assert.deepEqual(s, { ratio: 1, left: 0, over: 14, state: "over" });
  assert.equal(plain(budgetLabel(s)), "€ 14 over je budget");
});

test("budget: precies gehaald is nog niet over", () => {
  const s = budgetStatus(200, 200);
  assert.equal(s.state, "ok");
  assert.equal(s.ratio, 1);
  assert.equal(s.left, 0);
  assert.equal(plain(budgetLabel(s)), "Nog € 0");
});

test("budget: een paar cent over toont nooit € 0 over", () => {
  const s = budgetStatus(200.3, 200);
  assert.equal(s.state, "over");
  assert.equal(plain(budgetLabel(s)), "€ 1 over je budget");
});

test("budget: alleen terugbetalingen geeft een lege balk", () => {
  const s = budgetStatus(-20, 200);
  assert.equal(s.ratio, 0);
  assert.equal(s.left, 220);
  assert.equal(s.state, "ok");
});

test("budget: 0 of negatief bestaat niet", () => {
  assert.throws(() => budgetStatus(10, 0), RangeError);
  assert.throws(() => budgetStatus(10, -5), RangeError);
  assert.throws(() => budgetStatus(10, Number.NaN), RangeError);
});

test("doel: onderweg", () => {
  const s = goalStatus(340, 1000);
  assert.deepEqual(s, { ratio: 0.34, left: 660, reached: false, saved: 340, goal: 1000 });
  assert.equal(plain(goalLabel(s)), "€ 340 van € 1.000 · nog € 660");
});

test("doel: gehaald, ook als je eroverheen gaat", () => {
  assert.equal(goalLabel(goalStatus(1000, 1000)), "Doel gehaald. Netjes.");
  const over = goalStatus(1200, 1000);
  assert.equal(over.ratio, 1);
  assert.equal(over.left, 0);
  assert.equal(over.reached, true);
});

test("doel: 0 of negatief bestaat niet", () => {
  assert.throws(() => goalStatus(10, 0), RangeError);
});
