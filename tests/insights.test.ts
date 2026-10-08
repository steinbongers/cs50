import assert from "node:assert/strict";
import { test } from "node:test";
import {
  categoryDeviations,
  compareWithAverage,
  pickStandout,
  dailyStreak,
  monthReview,
  spentPerCategory,
  totalSpent,
  weeklySeries,
  type CatLite,
  type CategoryDeviation,
  type TxLite,
} from "../lib/insights/compute";

const cats: CatLite[] = [
  { id: "bood", name: "Boodschappen", icon: "shopping-cart", color: "groen", isIncome: false, systemKey: null, monthlyBudget: 200, goalAmount: null },
  { id: "uit", name: "Uit eten", icon: "utensils", color: "oranje", isIncome: false, systemKey: null, monthlyBudget: null, goalAmount: null },
  { id: "ink", name: "Inkomen", icon: "banknote", color: "groen", isIncome: true, systemKey: null, monthlyBudget: null, goalAmount: null },
  { id: "vg", name: "Voorgeschoten", icon: "hand-coins", color: "geel", isIncome: false, systemKey: "voorgeschoten", monthlyBudget: null, goalAmount: null },
];
const catMap = new Map(cats.map((c) => [c.id, c]));

const tx = (p: Partial<TxLite> & { bookingDate: string; amount: number }): TxLite => ({
  id: Math.random().toString(36).slice(2),
  ownShare: null,
  categoryId: null,
  createdAt: `${p.bookingDate}T10:00:00.000Z`,
  categorizedAt: `${p.bookingDate}T12:00:00.000Z`,
  isInternal: false,
  ...p,
});

test("uitgegeven telt eigen deel, terugbetalingen in potje negatief, inkomen en voorgeschoten niet", () => {
  const txs = [
    tx({ bookingDate: "2026-10-01", amount: -48, ownShare: 12, categoryId: "uit" }),
    tx({ bookingDate: "2026-10-02", amount: -23.45, categoryId: "bood" }),
    tx({ bookingDate: "2026-10-03", amount: 10, categoryId: "bood" }), // terugbetaling in potje
    tx({ bookingDate: "2026-10-04", amount: 1180, categoryId: "ink" }),
    tx({ bookingDate: "2026-10-05", amount: 12, categoryId: "vg" }),
    tx({ bookingDate: "2026-10-06", amount: -100, isInternal: true }),
    tx({ bookingDate: "2026-10-07", amount: -5, categoryId: null, categorizedAt: null }), // nog geen potje, telt wel als uitgave
  ];
  assert.equal(totalSpent(txs, catMap, "2026-10-01", "2026-11-01"), 30.45);
  const per = spentPerCategory(txs, catMap, "2026-10-01", "2026-11-01");
  assert.equal(per.get("uit"), 12);
  assert.equal(per.get("bood"), 13.45);
  assert.equal(per.has("ink"), false);
});

test("vergelijking met gemiddelde op hetzelfde punt in vorige periodes", () => {
  // salarisdag 25, vandaag 8 oktober 2026: periode sinds 25 sept, 14 dagen onderweg
  const txs = [
    tx({ bookingDate: "2026-09-26", amount: -50, categoryId: "bood" }), // huidige periode
    tx({ bookingDate: "2026-08-26", amount: -100, categoryId: "bood" }), // vorige periode, binnen 14 dagen
    tx({ bookingDate: "2026-09-20", amount: -500, categoryId: "bood" }), // vorige periode, na 14 dagen -> telt niet
    tx({ bookingDate: "2026-07-27", amount: -60, categoryId: "uit" }), // twee periodes terug
  ];
  const c = compareWithAverage(txs, catMap, 25, new Date(2026, 9, 8));
  assert.equal(c.current, 50);
  assert.equal(c.daysElapsed, 14);
  assert.equal(c.periodsUsed, 2);
  assert.equal(c.average, 80);
});

test("zonder vorige periodes is er geen gemiddelde", () => {
  const txs = [tx({ bookingDate: "2026-10-01", amount: -10, categoryId: "bood" })];
  const c = compareWithAverage(txs, catMap, 25, new Date(2026, 9, 8));
  assert.equal(c.average, null);
  assert.equal(c.periodsUsed, 0);
});

test("dagstreak: lege dagen tellen door, open kaart aan het eind van een dag breekt", () => {
  const today = new Date(2026, 9, 8, 15, 0, 0);
  const txs = [
    // binnengekomen 1 okt, zelfde dag gelabeld
    tx({ bookingDate: "2026-10-01", amount: -10, categoryId: "bood", createdAt: "2026-10-01T08:00:00.000Z", categorizedAt: "2026-10-01T09:00:00.000Z" }),
    // binnengekomen 5 okt, pas 7 okt gelabeld -> 5 en 6 okt breken de streak
    tx({ bookingDate: "2026-10-05", amount: -10, categoryId: "bood", createdAt: "2026-10-05T08:00:00.000Z", categorizedAt: "2026-10-07T09:00:00.000Z" }),
  ];
  const s = dailyStreak(txs, today);
  assert.equal(s.days, 1); // alleen 7 okt
  assert.equal(s.todayDone, true);

  const clean = [txs[0]];
  assert.equal(dailyStreak(clean, today).days, 7); // 1 t/m 7 okt
  assert.equal(dailyStreak([], today).days, 0);
});

test("dagstreak: vandaag open telt nog niet mee maar breekt gisteren niet", () => {
  const today = new Date(2026, 9, 8, 15, 0, 0);
  const txs = [
    tx({ bookingDate: "2026-10-01", amount: -10, categoryId: "bood", createdAt: "2026-10-01T08:00:00.000Z", categorizedAt: "2026-10-01T09:00:00.000Z" }),
    tx({ bookingDate: "2026-10-08", amount: -10, categoryId: null, createdAt: "2026-10-08T08:00:00.000Z", categorizedAt: null }),
  ];
  const s = dailyStreak(txs, today);
  assert.equal(s.days, 7);
  assert.equal(s.todayDone, false);
});

test("weekreeks: acht weken, maandag als start", () => {
  const txs = [
    tx({ bookingDate: "2026-10-06", amount: -20, categoryId: "bood" }), // week van ma 5 okt
    tx({ bookingDate: "2026-09-30", amount: -30, categoryId: "bood" }), // week van ma 28 sept
  ];
  const series = weeklySeries(txs, catMap, "bood", new Date(2026, 9, 8));
  assert.equal(series.length, 8);
  assert.equal(series[7].weekStart, "2026-10-05");
  assert.equal(series[7].spent, 20);
  assert.equal(series[6].spent, 30);
});

test("jouw maand: afgelopen periode tegenover gemiddelde en budget", () => {
  const txs = [
    tx({ bookingDate: "2026-09-26", amount: -10, categoryId: "bood" }), // huidige periode (telt niet)
    tx({ bookingDate: "2026-09-01", amount: -150, categoryId: "bood" }), // afgelopen periode (25 aug - 24 sept)
    tx({ bookingDate: "2026-09-02", amount: -40, categoryId: "uit" }),
    tx({ bookingDate: "2026-08-01", amount: -100, categoryId: "bood" }), // periode ervoor
  ];
  const review = monthReview(txs, cats, 25, new Date(2026, 9, 8))!;
  assert.equal(review.period.startISO, "2026-08-25");
  assert.equal(review.total, 190);
  assert.equal(review.average, 100);
  assert.equal(review.periodsUsed, 1);
  assert.equal(review.categories[0].category.id, "bood");
  assert.equal(review.categories[0].spent, 150);
  assert.equal(review.categories[0].budget, 200);
});

test("vergelijking: een vorige periode met alleen salaris telt niet als 0 uitgegeven", () => {
  const txs = [
    tx({ bookingDate: "2026-09-26", amount: -50, categoryId: "bood" }), // huidige periode
    tx({ bookingDate: "2026-08-26", amount: -100, categoryId: "bood" }), // vorige periode
    tx({ bookingDate: "2026-07-27", amount: 2500, categoryId: "ink" }), // twee terug: alleen salaris
    tx({ bookingDate: "2026-06-27", amount: -200, isInternal: true }), // drie terug: alleen eigen overboeking
  ];
  const c = compareWithAverage(txs, catMap, 25, new Date(2026, 9, 8));
  assert.equal(c.periodsUsed, 1);
  assert.equal(c.average, 100);
});

test("jouw maand: alleen salaris in de afgelopen periode is geen maand om te tonen", () => {
  const txs = [
    tx({ bookingDate: "2026-09-01", amount: 2500, categoryId: "ink" }),
    tx({ bookingDate: "2026-08-01", amount: -100, categoryId: "bood" }),
  ];
  assert.equal(monthReview(txs, cats, 25, new Date(2026, 9, 8)), null);

  // Met een echte uitgave wel; een eerdere periode met alleen salaris telt niet mee in het gemiddelde.
  const withSpend = [
    ...txs,
    tx({ bookingDate: "2026-09-02", amount: -40, categoryId: "uit" }),
    tx({ bookingDate: "2026-07-01", amount: 2500, categoryId: "ink" }),
  ];
  const review = monthReview(withSpend, cats, 25, new Date(2026, 9, 8))!;
  assert.equal(review.total, 40);
  assert.equal(review.periodsUsed, 1);
  assert.equal(review.average, 100);
});

test("uitgegeven wordt nooit negatief, ook met alleen terugbetalingen", async () => {
  const { totalSpent } = await import("../lib/insights/compute");
  const cats = new Map([["c1", { id: "c1", name: "Overig", icon: "package", color: "grijs", isIncome: false, systemKey: null, monthlyBudget: null, goalAmount: null }]]);
  const refund = { id: "t1", bookingDate: "2026-10-02", amount: 40, ownShare: null, categoryId: "c1", createdAt: "2026-10-02T10:00:00Z", categorizedAt: "2026-10-02T11:00:00Z", isInternal: false };
  assert.equal(totalSpent([refund], cats, "2026-10-01", "2026-11-01"), 0);
});

test("afwijking per potje: deze periode tegenover gemiddelde op hetzelfde punt", () => {
  // salarisdag 25, vandaag 8 oktober: 14 dagen onderweg
  const txs = [
    tx({ bookingDate: "2026-09-26", amount: -150, categoryId: "bood" }), // nu
    tx({ bookingDate: "2026-09-27", amount: -20, categoryId: "uit" }), // nu
    tx({ bookingDate: "2026-08-26", amount: -60, categoryId: "bood" }), // vorige, binnen 14 dagen
    tx({ bookingDate: "2026-09-20", amount: -400, categoryId: "bood" }), // vorige, na 14 dagen: telt niet
    tx({ bookingDate: "2026-07-27", amount: -40, categoryId: "bood" }), // twee terug
    tx({ bookingDate: "2026-07-28", amount: -30, categoryId: "uit" }),
    tx({ bookingDate: "2026-09-28", amount: 2500, categoryId: "ink" }), // inkomen: geen rij
    tx({ bookingDate: "2026-09-29", amount: 12, categoryId: "vg" }), // systeempotje: geen rij
  ];
  const rows = categoryDeviations(txs, cats, 25, new Date(2026, 9, 8));
  assert.deepEqual(
    rows.map((r) => r.categoryId),
    ["bood", "uit"],
  );
  assert.deepEqual(rows[0], { categoryId: "bood", current: 150, average: 50, diff: 100, periodsUsed: 2 });
  assert.deepEqual(rows[1], { categoryId: "uit", current: 20, average: 15, diff: 5, periodsUsed: 2 });
  // Werkt ook met een Map en met minder periodes.
  const one = categoryDeviations(txs, catMap, 25, new Date(2026, 9, 8), { maxPeriods: 1 });
  assert.equal(one[0].periodsUsed, 1);
  assert.equal(one[0].average, 60);
});

test("afwijking: sortering op grootste verschil, ook als het minder is", () => {
  const txs = [
    tx({ bookingDate: "2026-09-26", amount: -10, categoryId: "bood" }),
    tx({ bookingDate: "2026-09-26", amount: -45, categoryId: "uit" }),
    tx({ bookingDate: "2026-08-26", amount: -200, categoryId: "bood" }),
    tx({ bookingDate: "2026-08-26", amount: -40, categoryId: "uit" }),
  ];
  const rows = categoryDeviations(txs, cats, 25, new Date(2026, 9, 8));
  assert.equal(rows[0].categoryId, "bood");
  assert.equal(rows[0].diff, -190);
});

test("afwijking: zonder vorige periodes is het gemiddelde 0 en springt niets eruit", () => {
  const txs = [tx({ bookingDate: "2026-09-26", amount: -300, categoryId: "bood" })];
  const rows = categoryDeviations(txs, cats, 25, new Date(2026, 9, 8));
  assert.deepEqual(rows, [{ categoryId: "bood", current: 300, average: 0, diff: 300, periodsUsed: 0 }]);
  assert.equal(pickStandout(rows, 14), null);
});

test("afwijking: potjes die nu en eerder 0 zijn vallen weg", () => {
  assert.deepEqual(categoryDeviations([], cats, 25, new Date(2026, 9, 8)), []);
});

const dev = (p: Partial<CategoryDeviation>): CategoryDeviation => ({
  categoryId: "x",
  current: 0,
  average: 0,
  diff: 0,
  periodsUsed: 3,
  ...p,
});

test("opvaller: drempels voor bedrag, aandeel, periodes en dagen", () => {
  const big = dev({ categoryId: "a", current: 150, average: 100, diff: 50 });
  assert.equal(pickStandout([big], 14), big);
  // Minder dan 7 dagen onderweg: nog niets zeggen.
  assert.equal(pickStandout([big], 6), null);
  assert.equal(pickStandout([big], 7), big);
  // Onder € 25 verschil.
  assert.equal(pickStandout([dev({ current: 44, average: 20, diff: 24 })], 14), null);
  // Wel € 25, maar minder dan 25% van het gemiddelde.
  assert.equal(pickStandout([dev({ current: 430, average: 400, diff: 30 })], 14), null);
  // Precies op beide drempels telt.
  const edge = dev({ current: 125, average: 100, diff: 25 });
  assert.equal(pickStandout([edge], 14), edge);
  // Minder uitgeven telt ook.
  const less = dev({ current: 50, average: 100, diff: -50 });
  assert.equal(pickStandout([less], 14), less);
});

test("opvaller: gemiddelde 0 met een vorige periode is een opvaller vanaf € 25", () => {
  const fresh = dev({ current: 30, average: 0, diff: 30, periodsUsed: 1 });
  assert.equal(pickStandout([fresh], 10), fresh);
});

test("opvaller: neemt het eerste item dat aan alle drempels voldoet", () => {
  const noHistory = dev({ categoryId: "a", diff: 300, current: 300, average: 0, periodsUsed: 0 });
  const second = dev({ categoryId: "b", current: 180, average: 100, diff: 80 });
  assert.equal(pickStandout([noHistory, second], 14), second);
  assert.equal(pickStandout([], 14), null);
});
