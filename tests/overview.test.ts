import assert from "node:assert/strict";
import { test } from "node:test";
import { churnEntry } from "../app/(app)/instellingen/churn";
import { compareLine, openCardsText, periodMonthName } from "../components/overview/overview-copy";
import { groupSharesByPerson, shareAgeLabel, sharesSummary } from "../components/overview/share-groups";
import { currentPeriod } from "../lib/periods";

const share = (id: string, personName: string | null, amount: number, createdAt = "2026-10-01T12:00:00Z") => ({
  id,
  personName,
  amount,
  createdAt,
});

test("churnEntry: maandag in UTC en hele dagen sinds registratie", () => {
  assert.deepEqual(churnEntry("2026-10-04T23:30:00Z", new Date("2026-10-08T12:00:00Z")), {
    cohort_week: "2026-09-28",
    days_since_signup: 3,
  });
  // Maandag zelf blijft maandag.
  assert.equal(churnEntry("2026-10-05T00:10:00Z", new Date("2026-10-05T01:00:00Z")).cohort_week, "2026-10-05");
  // Ongeldige datum: geen negatieve dagen.
  assert.equal(churnEntry("onzin", new Date("2026-10-08T12:00:00Z")).days_since_signup, 0);
});

test("delen per persoon: hoofdletterongevoelig, zonder naam achteraan", () => {
  const groups = groupSharesByPerson([
    share("1", "Sam", 10),
    share("2", null, 50),
    share("3", "sam", 5.5),
    share("4", "Noor", 12),
  ]);
  assert.deepEqual(
    groups.map((g) => [g.name, g.total, g.shares.length]),
    [
      ["Sam", 15.5, 2],
      ["Noor", 12, 1],
      [null, 50, 1],
    ],
  );
});

test("samenvatting en leeftijd van delen", () => {
  assert.equal(sharesSummary([share("1", "Sam", 1)]), "1 deel bij Sam");
  assert.equal(
    sharesSummary([share("1", "A", 4), share("2", "B", 3), share("3", "C", 2), share("4", "D", 1)]),
    "4 delen bij A, B en 2 anderen",
  );
  const now = Date.parse("2026-10-08T12:00:00Z");
  assert.equal(shareAgeLabel("2026-10-01T12:00:00Z", now), null);
  assert.equal(shareAgeLabel("2026-09-01T12:00:00Z", now), "sinds 37 dagen");
});

test("maandnaam volgt de maand met de meeste dagen", () => {
  assert.equal(periodMonthName(currentPeriod(25, new Date(2026, 9, 8))), "oktober");
  assert.equal(periodMonthName(currentPeriod(null, new Date(2026, 9, 8))), "oktober");
});

test("vergelijkingsregel en kaartjestekst", () => {
  assert.equal(compareLine({ daysElapsed: 2, periodsUsed: 2, average: 100, current: 50 }), null);
  assert.equal(compareLine({ daysElapsed: 5, periodsUsed: 0, average: null, current: 50 })?.kind, "note");
  const near = compareLine({ daysElapsed: 5, periodsUsed: 3, average: 100, current: 105 });
  assert.deepEqual(near, { kind: "chip", tone: "neutral", text: "Precies rond je gemiddelde", basis: null });
  const less = compareLine({ daysElapsed: 5, periodsUsed: 1, average: 100, current: 50 });
  assert.equal(less?.kind === "chip" && less.tone, "positive");
  assert.match(less?.text ?? "", /minder dan je gemiddelde tot nu toe$/);
  assert.equal(less?.kind === "chip" && less.basis, "Op basis van 1 maand");
  assert.equal(openCardsText(1), "1 kaartje wacht");
  assert.equal(openCardsText(9), "9 kaartjes wachten");
});
