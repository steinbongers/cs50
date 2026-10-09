import assert from "node:assert/strict";
import { test } from "node:test";
import { ruleCategory, ruleKey, ruleLabel } from "../lib/transactions/rules";

test("vaste ontvanger: sleutel met richting, zonder hoofdletters en dubbele spaties", () => {
  assert.equal(ruleKey("Albert  Heijn ", -12), "uit:albert heijn");
  assert.equal(ruleKey("Werkgever BV", 2100), "in:werkgever bv");
  assert.equal(ruleKey("", -5), null);
  assert.equal(ruleKey(null, -5), null);
  assert.equal(ruleKey("Jumbo", 0), null);
  assert.equal(ruleKey("x".repeat(200), -1)!.length, 120);
  assert.deepEqual(ruleLabel("in:werkgever bv"), { counterparty: "werkgever bv", incoming: true });
});

test("vaste ontvanger: alleen dezelfde ontvanger in dezelfde richting", () => {
  const rules = new Map([["uit:jumbo", "pot-boodschappen"]]);
  assert.equal(ruleCategory(rules, { counterparty: "JUMBO", amount: -30 }), "pot-boodschappen");
  // Geld terug van de Jumbo gaat niet vanzelf in Boodschappen.
  assert.equal(ruleCategory(rules, { counterparty: "Jumbo", amount: 4 }), null);
  assert.equal(ruleCategory(rules, { counterparty: "Lidl", amount: -30 }), null);
});

test("vaste ontvanger: nooit een geldautomaat", () => {
  assert.equal(ruleKey("Geldmaat Amsterdam", -50), null);
  assert.equal(ruleCategory(new Map([["uit:geldmaat amsterdam", "pot-uitgaan"]]), { counterparty: "Geldmaat Amsterdam", amount: -20 }), null);
  // Geld storten bij de Geldmaat is geen opname; de sleutel blijft dan gewoon.
  assert.equal(ruleKey("Geldmaat Amsterdam", 50), "in:geldmaat amsterdam");
});
