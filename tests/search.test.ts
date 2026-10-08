import assert from "node:assert/strict";
import { test } from "node:test";
import { groupByDay, resultsBucket, sanitizeQuery } from "../lib/transactions/search";

test("sanitizeQuery trimt en zet om naar kleine letters", () => {
  assert.equal(sanitizeQuery("  Albert Heijn  "), "albert heijn");
  assert.equal(sanitizeQuery("AH"), "ah");
});

test("sanitizeQuery haalt tekens weg die het filter kunnen openbreken", () => {
  assert.equal(sanitizeQuery("a,b(c)d*e%f_g\\h"), "abcdefgh");
  assert.equal(sanitizeQuery("albert,description.ilike.*"), "albertdescription.ilike.");
  assert.equal(sanitizeQuery('"jumbo"'), "jumbo");
});

test("sanitizeQuery geeft null onder de twee tekens", () => {
  assert.equal(sanitizeQuery(""), null);
  assert.equal(sanitizeQuery("   "), null);
  assert.equal(sanitizeQuery("a"), null);
  assert.equal(sanitizeQuery(" a* "), null);
  assert.equal(sanitizeQuery("%%__"), null);
  assert.equal(sanitizeQuery(null), null);
  assert.equal(sanitizeQuery(undefined), null);
  assert.equal(sanitizeQuery("ab"), "ab");
});

test("sanitizeQuery voegt dubbele spaties samen", () => {
  assert.equal(sanitizeQuery("albert   heijn"), "albert heijn");
  assert.equal(sanitizeQuery("a ( b"), "a b");
});

test("groupByDay groepeert per datum en houdt de volgorde", () => {
  const rows = [
    { id: "1", bookingDate: "2026-10-08" },
    { id: "2", bookingDate: "2026-10-08" },
    { id: "3", bookingDate: "2026-10-07" },
    { id: "4", bookingDate: "2026-10-05" },
    { id: "5", bookingDate: "2026-10-05" },
  ];
  const groups = groupByDay(rows);
  assert.deepEqual(
    groups.map((g) => [g.date, g.rows.map((r) => r.id)]),
    [
      ["2026-10-08", ["1", "2"]],
      ["2026-10-07", ["3"]],
      ["2026-10-05", ["4", "5"]],
    ],
  );
});

test("groupByDay met een lege lijst geeft geen groepen", () => {
  assert.deepEqual(groupByDay([]), []);
});

test("groupByDay voegt een datum die later terugkomt bij de eerste groep", () => {
  const groups = groupByDay([
    { id: "a", bookingDate: "2026-10-08" },
    { id: "b", bookingDate: "2026-10-07" },
    { id: "c", bookingDate: "2026-10-08" },
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].rows.map((r) => r.id), ["a", "c"]);
});

test("resultsBucket", () => {
  assert.equal(resultsBucket(0), "0");
  assert.equal(resultsBucket(1), "1-5");
  assert.equal(resultsBucket(5), "1-5");
  assert.equal(resultsBucket(6), "6+");
  assert.equal(resultsBucket(200), "6+");
});
