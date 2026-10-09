import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OTHER_POTJES_ID,
  averageCumulative,
  averageFlow,
  compareIncome,
  cumulativeSpend,
  fixedVersusRest,
  incomeAndSpendPerPeriod,
  incomeTransactionsPerCategory,
  largestExpenses,
  niceTicks,
  periodLength,
  recentPeriods,
  recurringInput,
  spendPerWeekday,
  spendSeriesPerCategory,
  unsortedIncoming,
} from "../lib/insights/charts";
import type { CatLite, TxLite } from "../lib/insights/compute";
import { currentPeriod } from "../lib/periods";

const cat = (id: string, extra: Partial<CatLite> = {}): CatLite => ({
  id,
  name: id,
  icon: "package",
  color: "grijs",
  isIncome: false,
  systemKey: null,
  monthlyBudget: null,
  goalAmount: null,
  ...extra,
});
const cats = [cat("bood"), cat("uit"), cat("vervoer"), cat("ink", { isIncome: true }), cat("vg", { systemKey: "voorgeschoten" })];
const catMap = new Map(cats.map((c) => [c.id, c]));

const tx = (bookingDate: string, amount: number, categoryId: string | null, extra: Partial<TxLite> = {}): TxLite => ({
  id: Math.random().toString(36).slice(2),
  bookingDate,
  amount,
  ownShare: null,
  categoryId,
  createdAt: `${bookingDate}T10:00:00.000Z`,
  categorizedAt: `${bookingDate}T12:00:00.000Z`,
  isInternal: false,
  ...extra,
});

// Salarisdag 25, vandaag donderdag 8 oktober 2026: periode 25 sep – 23 okt (24 okt is zaterdag, dus 23 okt).
const today = new Date(2026, 9, 8);

test("recente periodes: oudste eerst, eindigend met de lopende", () => {
  const periods = recentPeriods(25, today, 6);
  assert.equal(periods.length, 6);
  assert.equal(periods.at(-1)?.startISO, "2026-09-25");
  assert.equal(periods[0].startISO < periods[1].startISO, true);
  for (let i = 1; i < periods.length; i++) assert.equal(periods[i - 1].endISO, periods[i].startISO);
});

test("inkomsten en uitgaven per periode, lege periodes vooraan vallen weg", () => {
  const periods = recentPeriods(null, today, 4); // juli t/m oktober
  const txs = [
    tx("2026-08-01", 1800, "ink"),
    tx("2026-08-03", -300, "bood"),
    tx("2026-08-04", 50, "vg"), // telt nergens mee
    tx("2026-09-01", 1800, "ink"),
    tx("2026-09-02", -2000, "uit"),
    tx("2026-10-02", -40, "bood"),
  ];
  const flows = incomeAndSpendPerPeriod(txs, catMap, periods, today);
  assert.deepEqual(
    flows.map((f) => [f.startISO, f.income, f.spent, f.net, f.current]),
    [
      ["2026-08-01", 1800, 300, 1500, false],
      ["2026-09-01", 1800, 2000, -200, false],
      ["2026-10-01", 0, 40, -40, true],
    ],
  );
  // Gemiddelde alleen over volle periodes.
  assert.deepEqual(averageFlow(flows), { income: 1800, spent: 1150, net: 650, periods: 2 });
  assert.equal(averageFlow(flows.slice(-1)), null);
});

test("inkomsten vergelijken: periodes zonder inkomen tellen niet mee, optioneel na even veel dagen", () => {
  const shown = currentPeriod(null, today);
  const previous = [currentPeriod(null, new Date(2026, 8, 1)), currentPeriod(null, new Date(2026, 7, 1)), currentPeriod(null, new Date(2026, 6, 1))];
  const txs = [
    tx("2026-10-01", 1900, "ink"),
    tx("2026-09-01", 1800, "ink"),
    tx("2026-09-20", 100, "ink"), // na dag 8: telt alleen bij de volle vergelijking
    tx("2026-08-02", 1700, "ink"),
  ];
  assert.deepEqual(compareIncome(txs, catMap, shown, previous), { current: 1900, average: 1800, periodsUsed: 2 });
  assert.deepEqual(compareIncome(txs, catMap, shown, previous, 8), { current: 1900, average: 1750, periodsUsed: 2 });
  assert.deepEqual(compareIncome([], catMap, shown, previous), { current: 0, average: null, periodsUsed: 0 });
});

test("inkomend geld zonder potje telt apart, eigen overboekingen niet", () => {
  const txs = [tx("2026-10-01", 25, null), tx("2026-10-02", 500, null, { isInternal: true }), tx("2026-10-03", -5, null)];
  assert.equal(unsortedIncoming(txs, "2026-10-01", "2026-11-01"), 25);
});

test("uitgaven per potje over periodes: top-n plus Overige potjes", () => {
  const periods = recentPeriods(null, today, 2); // september, oktober
  const txs = [
    tx("2026-09-03", -200, "bood"),
    tx("2026-10-03", -100, "bood"),
    tx("2026-09-05", -50, "uit"),
    tx("2026-10-05", -30, "vervoer"),
    tx("2026-10-06", 10, "vervoer"), // terugbetaling
    tx("2026-10-07", 1800, "ink"),
  ];
  const all = spendSeriesPerCategory(txs, catMap, periods);
  assert.deepEqual(
    all.map((s) => [s.id, s.values, s.total]),
    [
      ["bood", [200, 100], 300],
      ["uit", [50, 0], 50],
      ["vervoer", [0, 20], 20],
    ],
  );
  const top = spendSeriesPerCategory(txs, catMap, periods, 1);
  assert.deepEqual(
    top.map((s) => [s.id, s.values]),
    [
      ["bood", [200, 100]],
      [OTHER_POTJES_ID, [50, 20]],
    ],
  );
});

test("opgeteld per dag: lengte van de periode, refunds verlagen, nooit onder nul", () => {
  const period = currentPeriod(null, today); // oktober: 31 dagen
  assert.equal(periodLength(period), 31);
  const txs = [tx("2026-10-01", -10, "bood"), tx("2026-10-03", -20, "uit"), tx("2026-10-04", 5, "uit"), tx("2026-10-04", 1000, "ink")];
  const series = cumulativeSpend(txs, catMap, period, 5);
  assert.deepEqual(series, [10, 10, 30, 25, 25]);
  assert.equal(cumulativeSpend(txs, catMap, period).length, 31);
  assert.deepEqual(cumulativeSpend([tx("2026-10-01", 50, "bood")], catMap, period, 2), [0, 0]);
});

test("gemiddelde opgetelde lijn: kortere periode blijft op haar eindtotaal, lege periodes tellen niet", () => {
  const sep = currentPeriod(null, new Date(2026, 8, 10)); // 30 dagen
  const aug = currentPeriod(null, new Date(2026, 7, 10));
  const jul = currentPeriod(null, new Date(2026, 6, 10)); // leeg
  const txs = [tx("2026-09-01", -100, "bood"), tx("2026-09-30", -100, "bood"), tx("2026-08-01", -50, "bood"), tx("2026-08-31", -50, "bood")];
  const avg = averageCumulative(txs, catMap, [sep, aug, jul], 31);
  assert.equal(avg?.periodsUsed, 2);
  assert.equal(avg?.values[0], 75);
  assert.equal(avg?.values[29], 125); // dag 30: september 200, augustus nog 50
  assert.equal(avg?.values[30], 150); // september staat stil op 200, augustus 100
  assert.equal(averageCumulative([], catMap, [sep], 31), null);
});

test("uitgaven per weekdag: maandag eerst, gemiddeld per dag, begint bij de eerste transactie", () => {
  // Maandag 5 t/m zondag 18 oktober: twee weken.
  const txs = [
    tx("2026-10-05", -10, "bood"), // ma
    tx("2026-10-12", -30, "bood"), // ma
    tx("2026-10-10", -60, "uit"), // za
    tx("2026-10-11", 1800, "ink"), // zo, inkomen
  ];
  const result = spendPerWeekday(txs, catMap, "2026-09-01", "2026-10-19");
  assert.deepEqual(result.days, [2, 2, 2, 2, 2, 2, 2]);
  assert.deepEqual(result.totals, [40, 0, 0, 0, 0, 60, 0]);
  assert.deepEqual(result.average, [20, 0, 0, 0, 0, 30, 0]);
});

test("grootste uitgaven: eigen deel, grootste eerst, geen inkomen of terugbetalingen", () => {
  const txs = [
    tx("2026-10-01", -48, "uit", { ownShare: 12 }),
    tx("2026-10-02", -30, "bood"),
    tx("2026-10-03", -30, "bood"),
    tx("2026-10-04", 200, "bood"),
    tx("2026-10-05", -900, "vg"),
    tx("2026-10-06", -15, null),
    tx("2026-09-30", -500, "bood"), // vorige periode
  ];
  const top = largestExpenses(txs, catMap, "2026-10-01", "2026-11-01", 3);
  assert.deepEqual(
    top.map((r) => [r.tx.bookingDate, r.amount]),
    [
      ["2026-10-03", 30],
      ["2026-10-02", 30],
      ["2026-10-06", 15],
    ],
  );
});

test("inkomende kaartjes per inkomstenpotje, nieuwste eerst", () => {
  const txs = [tx("2026-10-01", 1800, "ink"), tx("2026-10-15", 50, "ink"), tx("2026-10-04", 20, "bood"), tx("2026-10-05", 30, null)];
  const groups = incomeTransactionsPerCategory(txs, catMap, "2026-10-01", "2026-11-01");
  assert.deepEqual([...groups.keys()], ["ink"]);
  assert.deepEqual(groups.get("ink")?.map((t) => t.amount), [50, 1800]);
});

test("vaste lasten tegenover de rest", () => {
  assert.deepEqual(fixedVersusRest(400, 1000), { fixed: 400, rest: 600, share: 0.4 });
  assert.deepEqual(fixedVersusRest(1200, 1000), { fixed: 1000, rest: 0, share: 1 });
  assert.equal(fixedVersusRest(0, 1000), null);
  assert.equal(fixedVersusRest(400, 0), null);
});

test("ronde as-waarden", () => {
  assert.deepEqual(niceTicks(230, 2), [0, 200, 400]);
  assert.deepEqual(niceTicks(1800, 2), [0, 1000, 2000]);
  assert.deepEqual(niceTicks(90, 3), [0, 50, 100]);
  assert.deepEqual(niceTicks(0), [0, 1]);
});

test("vaste lasten uit de geladen kaartjes: verdeelde afschrijving telt, de delen niet", () => {
  const withSystem = [...cats, cat("verdeeld", { systemKey: "verdeeld" })];
  const txs = [
    tx("2026-10-01", -450, "verdeeld", { counterparty: "ICS Creditcard" }),
    tx("2026-10-01", -300, "bood", { counterparty: "ICS Creditcard", isSplitPart: true }),
    tx("2026-10-02", -20, "vg", { counterparty: "Sijf" }),
  ];
  const input = recurringInput(txs, withSystem);
  assert.deepEqual(
    input.txs.map((t) => [t.amount, t.counterparty]),
    [
      [-450, "ICS Creditcard"],
      [-20, "Sijf"],
    ],
  );
  assert.equal(input.systemIds.has("vg"), true);
  assert.equal(input.systemIds.has("verdeeld"), false);
});
