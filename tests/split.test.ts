import assert from "node:assert/strict";
import { test } from "node:test";
import { splitEqually } from "../lib/transactions/split";

test("gelijk delen zonder rest", () => {
  const r = splitEqually(48, 4);
  assert.equal(r.ownShare, 12);
  assert.deepEqual(r.otherShares, [12, 12, 12]);
});

test("restcenten gaan naar de anderen en sommen exact op", () => {
  const r = splitEqually(10, 3);
  const sum = Math.round((r.ownShare + r.otherShares.reduce((a, b) => a + b, 0)) * 100) / 100;
  assert.equal(sum, 10);
  assert.equal(r.ownShare, 3.33);
  assert.deepEqual(r.otherShares, [3.33, 3.34]);
});

test("negatief bedrag wordt als absoluut genomen", () => {
  const r = splitEqually(-25.5, 2);
  assert.equal(r.ownShare, 12.75);
  assert.deepEqual(r.otherShares, [12.75]);
});

test("aantal personen wordt begrensd", () => {
  assert.equal(splitEqually(10, 1).otherShares.length, 1);
  assert.equal(splitEqually(10, 99).otherShares.length, 19);
});
