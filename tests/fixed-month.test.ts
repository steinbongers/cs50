import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanFixedItems, fixedTotals, groupMonth, monthLeft } from "../lib/insights/fixed-month";

const month = [
  { bookingDate: "2026-10-01", amount: -850, counterparty: "Woonstichting Huur" },
  { bookingDate: "2026-10-03", amount: -12.4, counterparty: "Albert Heijn" },
  { bookingDate: "2026-10-09", amount: -31.1, counterparty: "ALBERT HEIJN" },
  { bookingDate: "2026-10-12", amount: -8.2, counterparty: "Albert Heijn" },
  { bookingDate: "2026-10-15", amount: -10.99, counterparty: "Spotify" },
  { bookingDate: "2026-10-20", amount: 2100, counterparty: "Werkgever BV" },
  { bookingDate: "2026-10-22", amount: 25, counterparty: "J. Jansen" },
  { bookingDate: "2026-10-23", amount: -60, counterparty: "Kapper Knip" },
  { bookingDate: "2026-10-24", amount: 0, counterparty: "Nul" },
  { bookingDate: "2026-10-25", amount: -5, counterparty: null },
];

test("vaste maand: per verkoper en richting, met totaal en aantal", () => {
  const groups = groupMonth(month);
  const ah = groups.find((g) => g.key === "albert heijn")!;
  assert.equal(ah.count, 3);
  assert.equal(ah.total, 51.7);
  assert.equal(ah.direction, "uit");
  assert.equal(groups.find((g) => g.key === "werkgever bv")!.direction, "in");
  // Zonder tegenpartij of zonder bedrag: niet in de lijst.
  assert.equal(groups.length, 6);
});

test("vaste maand: wat op vast lijkt staat bovenaan, maar niets is aangevinkt", () => {
  const groups = groupMonth(month);
  const likely = groups.filter((g) => g.likely).map((g) => g.key);
  assert.deepEqual(likely.sort(), ["spotify", "werkgever bv", "woonstichting huur"]);
  assert.ok(groups.slice(0, 3).every((g) => g.likely));
  // Drie keer naar de supermarkt is winkelen, geen vaste last.
  assert.equal(groups.find((g) => g.key === "albert heijn")!.likely, false);
  assert.equal(groups.find((g) => g.key === "kapper knip")!.likely, false);
});

const items = [
  { direction: "in" as const, key: "werkgever bv", name: "Werkgever BV", amount: 2100 },
  { direction: "uit" as const, key: "woonstichting huur", name: "Woonstichting Huur", amount: 850 },
  { direction: "uit" as const, key: "spotify", name: "Spotify", amount: 10.99 },
];

test("vaste maand: vrij per maand is inkomsten min vaste kosten", () => {
  assert.deepEqual(fixedTotals(items), { fixedIn: 2100, fixedOut: 860.99, freePerMonth: 1239.01 });
  assert.deepEqual(fixedTotals([]), { fixedIn: 0, fixedOut: 0, freePerMonth: 0 });
});

test("nog over: begin van de maand is het hele vrije bedrag", () => {
  assert.deepEqual(monthLeft(items, []), { left: 1239.01, variable: 0 });
});

test("nog over: andere uitgaven gaan eraf, vaste posten tellen niet dubbel", () => {
  const txs = [
    { amount: 2100, counterparty: "WERKGEVER BV" }, // vast, al gerekend
    { amount: -850, counterparty: "Woonstichting Huur" }, // vast, al gerekend
    { amount: -40, counterparty: "Albert Heijn" },
    { amount: -100, counterparty: "Spaarrekening" }, // sparen is uitgegeven
    { amount: 25, counterparty: "J. Jansen" }, // extra geld erbij
  ];
  const result = monthLeft(items, txs);
  assert.equal(result.left, 1124.01);
  assert.equal(result.variable, 115);
});

test("nog over: geld terug van een vaste verkoper is geen vaste post", () => {
  // Richting telt: een terugbetaling van de huurbaas is extra geld, geen huur.
  assert.equal(monthLeft(items, [{ amount: 50, counterparty: "Woonstichting Huur" }]).left, 1289.01);
});

test("nog over: kan onder nul komen", () => {
  assert.equal(monthLeft(items, [{ amount: -1300, counterparty: "Vakantie" }]).left, -60.99);
});

test("opslaan: alleen geldige posten, elk één keer", () => {
  const cleaned = cleanFixedItems([
    { direction: "uit", name: "  Huur   Woning ", amount: 850.004 },
    { direction: "uit", name: "huur woning", amount: 1 }, // dubbel
    { direction: "in", name: "Salaris", amount: 2100 },
    { direction: "op", name: "Fout", amount: 1 },
    { direction: "uit", name: "", amount: 5 },
    { direction: "uit", name: "Nul", amount: 0 },
    { direction: "uit", name: "Tekst", amount: "12" },
    null,
  ]);
  assert.deepEqual(cleaned, [
    { direction: "uit", key: "huur woning", name: "Huur Woning", amount: 850 },
    { direction: "in", key: "salaris", name: "Salaris", amount: 2100 },
  ]);
  assert.deepEqual(cleanFixedItems("onzin"), []);
});
