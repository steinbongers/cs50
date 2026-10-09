import assert from "node:assert/strict";
import { test } from "node:test";
import { spendOf, type CatLite, type TxLite } from "../lib/insights/compute";
import {
  estimateInputValue,
  estimatedOwnShare,
  isValidEstimate,
  nameMatches,
  orderRefundCandidates,
  receivedPerExpense,
  refundMathText,
  refundOutcome,
  refundProgressText,
  refundUndoText,
} from "../lib/transactions/refunds";

/** Intl zet een vaste spatie tussen € en het bedrag; voor de vergelijking gewone spaties. */
const plain = (text: string) => text.replace(/\u00a0/g, " ");

test("al terug per uitgave telt alleen inkomende terugbetalingen met een uitgave", () => {
  const totals = receivedPerExpense([
    { refundForId: "a", amount: 30 },
    { refundForId: "a", amount: 15.5 },
    { refundForId: "b", amount: 10 },
    { refundForId: null, amount: 99 },
    { refundForId: "b", amount: -5 },
  ]);
  assert.equal(totals.get("a"), 45.5);
  assert.equal(totals.get("b"), 10);
  assert.equal(totals.size, 2);
});

test("uitkomst: wat er terug is en wat van jou blijft", () => {
  assert.deepEqual(refundOutcome(-90, 30, 30), { received: 60, own: 30, complete: false });
  assert.deepEqual(refundOutcome(90, 60, 30), { received: 90, own: 0, complete: true });
  // Meer terug dan uitgegeven: van jou is nooit negatief.
  assert.deepEqual(refundOutcome(90, 60, 40), { received: 100, own: 0, complete: true });
  // Centen blijven heel.
  assert.deepEqual(refundOutcome(10, 3.33, 3.33), { received: 6.66, own: 3.34, complete: false });
});

test("de som in de vraag", () => {
  assert.equal(plain(refundMathText(90, 30, 30)), "Al terug € 30,00 + nu € 30,00 = € 60,00. Dan is € 30,00 van jou.");
  assert.equal(plain(refundMathText(90, 0, 30)), "Nu € 30,00 terug. Dan is € 60,00 van jou.");
  assert.equal(plain(refundMathText(90, 60, 30)), "Al terug € 60,00 + nu € 30,00 = € 90,00. Dat is alles wat je uitgaf.");
  assert.equal(plain(refundMathText(90, 60, 40)), "Al terug € 60,00 + nu € 40,00 = € 100,00. Dat is € 10,00 meer dan je uitgaf.");
});

test("teksten voor voortgang en de pil", () => {
  assert.equal(plain(refundProgressText(30, -90)), "€ 30,00 van € 90,00 terug");
  assert.equal(plain(refundUndoText(30, "Uit eten", false)), "€ 30,00 terug voor Uit eten · nog open");
  assert.equal(plain(refundUndoText(30, "Uit eten", true)), "€ 30,00 terug voor Uit eten · klaar, de rest is van jou");
  assert.equal(plain(refundUndoText(30, "Uit eten", true, 25)), "€ 30,00 terug voor Uit eten · klaar, jouw deel € 25,00");
});

test("meest waarschijnlijke uitgave eerst: naam die overeenkomt, daarna de nieuwste", () => {
  const expenses = [
    { id: "oud", counterparty: "Cafe Belgie", bookingDate: "2026-09-01" },
    { id: "nieuw", counterparty: "Pathe", bookingDate: "2026-10-05" },
    { id: "match", counterparty: "Zalando", bookingDate: "2026-08-20" },
    { id: "midden", counterparty: "Albert Heijn", bookingDate: "2026-09-15" },
  ];
  const ordered = orderRefundCandidates(expenses, { counterparty: "ZALANDO PAYMENTS", description: null });
  assert.deepEqual(
    ordered.map((e) => e.id),
    ["match", "nieuw", "midden", "oud"],
  );
  // Een Tikkie noemt vaak waarvoor in de omschrijving.
  const viaDescription = orderRefundCandidates(expenses, { counterparty: "S. de Vries", description: "Tikkie Cafe Belgie" });
  assert.equal(viaDescription[0].id, "oud");
  // De invoer blijft ongemoeid.
  assert.equal(expenses[0].id, "oud");
});

test("naam-match is hoofdletterongevoelig en leeg matcht nooit", () => {
  assert.equal(nameMatches("sanne", "Tikkie Sanne B"), true);
  assert.equal(nameMatches(null, "Sanne"), false);
  assert.equal(nameMatches("  ", "Sanne"), false);
});

test("schatting: tussen 0 en het hele bedrag, in centen", () => {
  assert.equal(isValidEstimate(0, -90), true);
  assert.equal(isValidEstimate(90, -90), true);
  assert.equal(isValidEstimate(45.5, 90), true);
  assert.equal(isValidEstimate(90.01, -90), false);
  assert.equal(isValidEstimate(-1, -90), false);
  assert.equal(isValidEstimate(10.555, -90), false);
  assert.equal(isValidEstimate(Number.NaN, -90), false);
  assert.equal(isValidEstimate("50", -90), false);
});

test("voorinvulling is wat er nu van jou zou zijn", () => {
  assert.equal(estimateInputValue(90, 30), "60");
  assert.equal(estimateInputValue(10, 3.33), "6,67");
  assert.equal(estimateInputValue(90, 120), "0");
});

test("own_share met schatting: het potje telt precies de schatting", () => {
  const cat: CatLite = {
    id: "eten",
    name: "Uit eten",
    icon: "utensils",
    color: "oranje",
    isIncome: false,
    systemKey: null,
    monthlyBudget: null,
    goalAmount: null,
  };
  const cats = new Map([[cat.id, cat]]);
  const tx = (id: string, amount: number, ownShare: number | null = null): TxLite => ({
    id,
    bookingDate: "2026-10-01",
    amount,
    ownShare,
    categoryId: cat.id,
    createdAt: "2026-10-01T10:00:00Z",
    categorizedAt: "2026-10-01T10:00:00Z",
    isInternal: false,
  });

  for (const [refunds, estimate] of [
    [[30], 40],
    [[30, 20], 25],
    [[], 50],
    [[45, 45], 0],
    [[10.1, 3.33], 33.33],
  ] as [number[], number][]) {
    const received = refunds.reduce((a, b) => a + b, 0);
    const ownShare = estimatedOwnShare(estimate, received);
    const total = [tx("uitgave", -90, ownShare), ...refunds.map((r, i) => tx(`terug-${i}`, r))].reduce(
      (sum, t) => sum + spendOf(t, cats),
      0,
    );
    assert.equal(Math.round(total * 100) / 100, estimate, `${refunds.join("+")} → ${estimate}`);
  }

  // Zonder schatting (alles via de bank): uitgave telt helemaal, terugbetalingen gaan eraf.
  const viaBank = [tx("uitgave", -90), tx("terug", 30)].reduce((sum, t) => sum + spendOf(t, cats), 0);
  assert.equal(viaBank, 60);
});
