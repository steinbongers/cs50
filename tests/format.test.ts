import assert from "node:assert/strict";
import { test } from "node:test";
import { formatEuro, formatEuroAbs, formatEuroWhole, formatSignedEuro } from "../lib/format";

const hasMinus = (s: string) => /[-−]/.test(s);
/** Vergelijk zonder te struikelen over het soort spatie dat Intl kiest. */
const plain = (s: string) => s.replace(/[  ]/g, " ");

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
  assert.equal(formatSignedEuro(-0.001), zero);
});

test("nul is € 0,00", () => {
  assert.equal(plain(formatEuro(0)), "€ 0,00");
  assert.equal(plain(formatEuroWhole(0)), "€ 0");
});

test("negatief is '− € 12,50' met echte minus en vaste spatie", () => {
  assert.equal(formatEuro(-12.5), "− " + formatEuro(12.5));
  assert.equal(plain(formatEuro(-12.5)), "− € 12,50");
  assert.ok(!formatEuro(-12.5).includes("-"));
  assert.ok(formatEuro(-12.5).startsWith("− €"));
  assert.equal(plain(formatEuroWhole(-12)), "− € 12");
  assert.equal(plain(formatSignedEuro(-12.5)), "− € 12,50");
  assert.equal(plain(formatSignedEuro(12.5)), "+ € 12,50");
});

test("duizendtallen krijgen een punt", () => {
  assert.equal(plain(formatEuroWhole(1250)), "€ 1.250");
  assert.equal(plain(formatEuro(1250)), "€ 1.250,00");
  assert.equal(plain(formatEuro(-1250.5)), "− € 1.250,50");
  assert.equal(plain(formatEuroWhole(1250000)), "€ 1.250.000");
});

test("gewone bedragen blijven gewoon", () => {
  assert.ok(formatEuro(-12.34).endsWith("12,34"));
  assert.ok(hasMinus(formatEuro(-12.34)));
  assert.ok(formatEuro(0.005).endsWith("0,01"));
  assert.ok(formatEuroWhole(-1).endsWith("1"));
  assert.ok(hasMinus(formatEuroWhole(-1)));
  assert.ok(!hasMinus(formatEuroAbs(-12.34)));
});
