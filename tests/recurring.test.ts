import assert from "node:assert/strict";
import { test } from "node:test";
import { freeUntilLabel, recurringSummary, weekDiffText } from "../components/overview/overview-copy";
import type { CatLite, TxLite } from "../lib/insights/compute";
import { computeFreeToSpend } from "../lib/insights/free-to-spend";
import { monthClosing } from "../lib/insights/month-closing";
import { detectRecurring, nextOccurrenceISO, recurringMonthlyTotal, type RecurringCharge, type RecurringTx } from "../lib/insights/recurring";
import { reviewWeekStart, weekReview } from "../lib/insights/week";
import { toISODate } from "../lib/format";

// Salarisdag 25, vandaag 9 oktober 2026: periode sinds 25 sep; vorige drie: 25 aug, 24 jul, 25 jun.
const TODAY = new Date(2026, 9, 9);
const SYSTEM = new Set(["vg"]);

const rtx = (bookingDate: string, amount: number, counterparty: string | null, extra: Partial<RecurringTx> = {}): RecurringTx => ({
  bookingDate,
  amount,
  counterparty,
  categoryId: null,
  isInternal: false,
  ...extra,
});

test("vaste last: in 2 van de 3 maanden met ongeveer hetzelfde bedrag", () => {
  const charges = detectRecurring(
    [
      rtx("2026-07-28", -12.99, "Spotify"),
      rtx("2026-08-28", -12.99, "SPOTIFY "),
      rtx("2026-09-28", -12.99, "Spotify"),
      rtx("2026-08-03", -650, "Woonstichting"),
      rtx("2026-09-02", -680, "Woonstichting"), // binnen 20%
    ],
    SYSTEM,
    25,
    TODAY,
  );
  assert.deepEqual(
    charges.map((c) => [c.key, c.averageAmount, c.usualDay, c.lastDate, c.paidThisPeriod]),
    [
      ["woonstichting", 665, 3, "2026-09-02", false],
      ["spotify", 12.99, 28, "2026-09-28", true],
    ],
  );
  assert.equal(charges[1].name, "Spotify");
  assert.equal(recurringMonthlyTotal(charges), 677.99);
});

test("geen vaste last: één keer, wisselend bedrag, vaak per maand, eigen overboeking of systeempotje", () => {
  const charges = detectRecurring(
    [
      rtx("2026-09-10", -40, "Eenmalig"),
      rtx("2026-08-10", -10, "Wisselend"),
      rtx("2026-09-10", -50, "Wisselend"),
      // Supermarkt: drie keer per maand is winkelen.
      ...["2026-07-01", "2026-07-08", "2026-07-15", "2026-08-01", "2026-08-08", "2026-09-01"].map((d) => rtx(d, -20, "Albert Heijn")),
      rtx("2026-08-05", -100, "Spaarrekening", { isInternal: true }),
      rtx("2026-09-05", -100, "Spaarrekening", { isInternal: true }),
      rtx("2026-08-06", -30, "Sam", { categoryId: "vg" }),
      rtx("2026-09-06", -30, "Sam", { categoryId: "vg" }),
      rtx("2026-08-07", 30, "Inkomend"),
      rtx("2026-09-07", 30, "Inkomend"),
      rtx("2026-08-08", -5, null),
      rtx("2026-09-08", -5, null),
      // Te oud: vier maanden terug telt niet.
      rtx("2026-05-28", -9, "Oud"),
      rtx("2026-09-28", -9, "Oud"),
    ],
    SYSTEM,
    25,
    TODAY,
  );
  assert.deepEqual(charges, []);
});

test("vaste last: de betaling die het dichtst bij het gewone bedrag ligt telt, uitschieters niet", () => {
  const [charge] = detectRecurring(
    [rtx("2026-07-02", -20, "Telefoon"), rtx("2026-08-02", -21, "Telefoon"), rtx("2026-09-02", -60, "Telefoon")],
    SYSTEM,
    25,
    TODAY,
  );
  assert.equal(charge.averageAmount, 20.5);
  assert.equal(charge.lastDate, "2026-08-02");
});

test("eerstvolgende dag van de maand, met korte maanden", () => {
  assert.equal(nextOccurrenceISO(9, TODAY), "2026-10-09");
  assert.equal(nextOccurrenceISO(3, TODAY), "2026-11-03");
  assert.equal(nextOccurrenceISO(31, new Date(2026, 10, 10)), "2026-11-30");
  assert.equal(nextOccurrenceISO(31, new Date(2027, 1, 1)), "2027-02-28");
});

const charge = (key: string, averageAmount: number, usualDay: number, paidThisPeriod: boolean): RecurringCharge => ({
  key,
  name: key,
  averageAmount,
  usualDay,
  lastDate: "2026-09-01",
  paidThisPeriod,
});

test("vrij tot je salaris: saldo min wat nog komt vóór de salarisdag", () => {
  // Periode 25 sep tot 23 okt (25 okt is zondag, dus vrijdag 23 okt).
  const free = computeFreeToSpend({
    balances: [400, 120.5],
    recurring: [
      charge("huur", 650, 1, true), // al betaald
      charge("sport", 30, 15, false), // komt nog
      charge("telefoon", 20, 12, false), // komt nog
      charge("verzekering", 100, 27, false), // pas na de salarisdag
    ],
    salaryDay: 25,
    today: TODAY,
  });
  assert.ok(free);
  assert.equal(free.until, "2026-10-23");
  assert.equal(free.balance, 520.5);
  assert.equal(free.amount, 470.5);
  assert.deepEqual(free.upcoming.map((u) => [u.key, u.expectedDate]), [
    ["telefoon", "2026-10-12"],
    ["sport", "2026-10-15"],
  ]);
  assert.equal(freeUntilLabel(free.until), "Vrij tot de 23e");
});

test("vrij tot je salaris: niets zonder salarisdag of zonder bekend saldo", () => {
  const base = { recurring: [], today: TODAY };
  assert.equal(computeFreeToSpend({ ...base, balances: [100], salaryDay: null }), null);
  assert.equal(computeFreeToSpend({ ...base, balances: [], salaryDay: 25 }), null);
  assert.equal(computeFreeToSpend({ ...base, balances: [100, null], salaryDay: 25 }), null);
  assert.equal(computeFreeToSpend({ ...base, balances: [100], salaryDay: 25 })?.amount, 100);
});

const cats: CatLite[] = [
  { id: "bood", name: "Boodschappen", icon: "shopping-cart", color: "groen", isIncome: false, isSavings: false, systemKey: null, monthlyBudget: null, goalAmount: null },
  { id: "uit", name: "Uitgaan", icon: "beer", color: "oranje", isIncome: false, isSavings: false, systemKey: null, monthlyBudget: null, goalAmount: null },
  { id: "verv", name: "Vervoer", icon: "train", color: "blauw", isIncome: false, isSavings: false, systemKey: null, monthlyBudget: null, goalAmount: null },
  { id: "abo", name: "Abonnementen", icon: "repeat", color: "paars", isIncome: false, isSavings: false, systemKey: null, monthlyBudget: null, goalAmount: null },
  { id: "ink", name: "Inkomen", icon: "banknote", color: "groen", isIncome: true, isSavings: false, systemKey: null, monthlyBudget: null, goalAmount: null },
  { id: "vg", name: "Voorgeschoten", icon: "hand-coins", color: "geel", isIncome: false, isSavings: false, systemKey: "voorgeschoten", monthlyBudget: null, goalAmount: null },
];
const catMap = new Map(cats.map((c) => [c.id, c]));
const tx = (bookingDate: string, amount: number, categoryId: string | null, extra: Partial<TxLite> = {}): TxLite => ({
  id: Math.random().toString(36).slice(2),
  bookingDate,
  amount,
  ownShare: null,
  categoryId,
  createdAt: `${bookingDate}T10:00:00.000Z`,
  categorizedAt: categoryId ? `${bookingDate}T12:00:00.000Z` : null,
  isInternal: false,
  ...extra,
});

test("weekterugblik: alleen zondag en maandag, steeds dezelfde week", () => {
  assert.equal(reviewWeekStart(new Date(2026, 9, 9)), null); // vrijdag
  assert.equal(toISODate(reviewWeekStart(new Date(2026, 9, 11))!), "2026-10-05"); // zondag
  assert.equal(toISODate(reviewWeekStart(new Date(2026, 9, 12))!), "2026-10-05"); // maandag
});

test("weekterugblik: top 3 potjes met het verschil met de week ervoor", () => {
  const txs = [
    tx("2026-10-05", -40, "bood"),
    tx("2026-10-11", -10, "bood"),
    tx("2026-10-07", -30, "uit"),
    tx("2026-10-08", -12, "verv"),
    tx("2026-10-09", -5, "abo"),
    tx("2026-10-09", -500, "vg"), // systeempotje telt niet
    tx("2026-10-09", 1500, "ink"),
    tx("2026-10-12", -99, "abo"), // volgende week
    tx("2026-09-30", -20, "bood"), // week ervoor
    tx("2026-09-29", -30, "uit"),
  ];
  const review = weekReview(txs, catMap, new Date(2026, 9, 12));
  assert.ok(review);
  assert.equal(review.weekStartISO, "2026-10-05");
  assert.equal(review.weekEndISO, "2026-10-11");
  assert.equal(review.total, 97);
  assert.equal(review.previousTotal, 50);
  assert.deepEqual(review.rows.map((r) => [r.categoryId, r.spent, r.previous, r.diff]), [
    ["bood", 50, 20, 30],
    ["uit", 30, 30, 0],
    ["verv", 12, 0, 12],
  ]);
  assert.equal(weekReview([], catMap, new Date(2026, 9, 12)), null);
  assert.equal(weekReview(txs, catMap, new Date(2026, 9, 9)), null);
});

/** Bedragen gebruiken een vaste spatie; voor de vergelijking een gewone. */
const plain = (text: string) => text.replace(/\u00a0/g, " ");

test("weekterugblik: neutrale teksten", () => {
  assert.equal(plain(weekDiffText(50, 20)), "€ 30 meer dan de week ervoor");
  assert.equal(plain(weekDiffText(10, 25)), "€ 15 minder dan de week ervoor");
  assert.equal(plain(weekDiffText(30, 30.2)), "Net als de week ervoor");
  assert.equal(plain(weekDiffText(12, 0)), "De week ervoor niets");
});

test("vaste lasten: samenvatting enkel- en meervoud", () => {
  assert.equal(plain(recurringSummary(47.2, 6)), "Je betaalt € 47 per maand aan 6 vaste lasten.");
  assert.equal(plain(recurringSummary(12.99, 1)), "Je betaalt € 13 per maand aan 1 vaste last.");
});

test("maandafsluiting: uitgegeven, grootste potje en aantal gesorteerde kaartjes", () => {
  const txs = [
    tx("2026-09-01", -40, "bood"),
    tx("2026-09-10", -70, "uit"),
    tx("2026-09-12", -10, "uit"),
    tx("2026-09-13", 2000, "ink"),
    tx("2026-09-14", -5, null), // nog op de stapel
    tx("2026-09-15", -100, null, { isInternal: true }),
    tx("2026-10-02", -15, "bood"), // nieuwe maand
  ];
  // Zonder salarisdag: kalendermaanden. Vandaag 2 oktober: afgelopen maand is september.
  const closing = monthClosing(txs, cats, null, new Date(2026, 9, 2));
  assert.deepEqual(closing, {
    periodStartISO: "2026-09-01",
    spent: 125,
    biggest: { categoryId: "uit", name: "Uitgaan", amount: 80 },
    sorted: 4,
  });
  assert.equal(monthClosing([tx("2026-10-02", -15, "bood")], cats, null, new Date(2026, 9, 2)), null);
});
