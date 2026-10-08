import assert from "node:assert/strict";
import { test } from "node:test";
import { formatEuro, formatEuroAbs, formatEuroWhole } from "../lib/format";

const hasMinus = (s: string) => /[-\u2212]/.test(s);

test("negatieve nul en afrondrestjes worden als nul getoond", () => {
  const zero = formatEuro(0);
  assert.equal(formatEuro(-0), zero);
  assert.equal(formatEuro(-0.001), zero);
  assert.equal(formatEuro(0.004), zero);
  assert.ok(!hasMinus(zero));
  assert.ok(zero.endsWith("0,00"));

  const whole = formatEuroWhole(0);
  assert.equal(formatEuroWhole(-0), whole);
  assert.equal(formatEuroWhole(-0.4), whole);
  assert.ok(!hasMinus(whole));
  assert.ok(whole.endsWith("0"));
  assert.ok(!whole.includes(","));

  assert.equal(formatEuroAbs(-0), zero);
  assert.equal(formatEuroAbs(-0.001), zero);
});

test("gewone bedragen blijven gewoon", () => {
  assert.ok(formatEuro(-12.34).endsWith("12,34"));
  assert.ok(hasMinus(formatEuro(-12.34)));
  assert.ok(formatEuro(0.005).endsWith("0,01"));
  assert.ok(formatEuroWhole(-1).endsWith("1"));
  assert.ok(hasMinus(formatEuroWhole(-1)));
  assert.ok(!hasMinus(formatEuroAbs(-12.34)));
});
