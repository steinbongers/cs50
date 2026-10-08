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

test("centen gaan nooit verloren door floating point", () => {
  const r = splitEqually(1.14, 2);
  assert.equal(r.ownShare, 0.57);
  assert.deepEqual(r.otherShares, [0.57]);

  for (const total of [1.14, 4.35, 1.15, 0.57]) {
    for (let persons = 2; persons <= 6; persons++) {
      const result = splitEqually(total, persons);
      const sumCents = [result.ownShare, ...result.otherShares].reduce((a, b) => a + Math.round(b * 100), 0);
      assert.equal(sumCents, Math.round(total * 100), `${total} / ${persons}`);
      for (const share of [result.ownShare, ...result.otherShares]) {
        assert.equal(Math.round(share * 100) / 100, share, `geen hele centen: ${total} / ${persons} -> ${share}`);
        assert.ok(share >= 0);
      }
      assert.equal(result.otherShares.length, persons - 1);
    }
  }
});
