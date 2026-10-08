import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareWithAverage,
  dailyStreak,
  monthReview,
  spentPerCategory,
  totalSpent,
  weeklySeries,
  type CatLite,
  type TxLite,
} from "../lib/insights/compute";

const cats: CatLite[] = [
  { id: "bood", name: "Boodschappen", icon: "shopping-cart", color: "groen", isIncome: false, systemKey: null, monthlyBudget: 200 },
  { id: "uit", name: "Uit eten", icon: "utensils", color: "oranje", isIncome: false, systemKey: null, monthlyBudget: null },
  { id: "ink", name: "Inkomen", icon: "banknote", color: "groen", isIncome: true, systemKey: null, monthlyBudget: null },
  { id: "vg", name: "Voorgeschoten", icon: "hand-coins", color: "geel", isIncome: false, systemKey: "voorgeschoten", monthlyBudget: null },
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
