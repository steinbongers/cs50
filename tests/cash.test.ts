import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CASH_NOTE_MAX,
  allocateCashSpend,
  cashAmount,
  cashBuckets,
  cashNote,
  cashRemaining,
  isCashWithdrawal,
} from "../lib/transactions/cash";

const out = (counterparty: string, description: string | null = null, amount = -50) => ({ counterparty, description, amount });

test("pinopname: Nederlandse banken", () => {
  assert.equal(isCashWithdrawal(out("Geldmaat Amsterdam")), true);
  assert.equal(isCashWithdrawal(out("GELDMAAT ROTTERDAM CS")), true);
  // ABN AMRO: tegenpartij leeg, alles in de omschrijving.
  assert.equal(
    isCashWithdrawal({
      counterparty: null,
      description: null,
      rawDescription: "GEA   NR:S1J3B8   08.10.26/14.23 GELDMAAT AMSTERDAM,PAS123",
      amount: -20,
    }),
    true,
  );
  assert.equal(isCashWithdrawal({ rawDescription: "GEA NR:00AB12 Utrecht", amount: -70 }), true);
  assert.equal(isCashWithdrawal(out("Rabobank", "Geldautomaat Utrecht Centrum")), true);
  assert.equal(isCashWithdrawal(out("Onbekende tegenpartij", "Geldopname Bancontact")), true);
  assert.equal(isCashWithdrawal(out("bunq", "Cash withdrawal Lisbon")), true);
  assert.equal(isCashWithdrawal(out("Contante opname")), true);
});

test("pinopname: in het buitenland", () => {
  assert.equal(isCashWithdrawal(out("ATM Barcelona")), true);
  assert.equal(isCashWithdrawal(out("Euronet", "ATM WITHDRAWAL PRAGUE")), true);
  assert.equal(isCashWithdrawal(out("Bankomat Raiffeisen Wien")), true);
  assert.equal(isCashWithdrawal(out("Sparkasse Geldautomat Berlin")), true);
  assert.equal(isCashWithdrawal(out("Distributeur BNP Paribas Paris")), true);
  assert.equal(isCashWithdrawal(out("Cajero Santander Madrid")), true);
  assert.equal(isCashWithdrawal(out("Multibanco Levantamento Porto")), true);
  assert.equal(isCashWithdrawal(out("Cashpoint Barclays London")), true);
  assert.equal(isCashWithdrawal(out("CASH LONDON 12")), true);
  // Een plaatsnaam met "spaar" maakt van een Geldmaat geen spaaroverboeking.
  assert.equal(isCashWithdrawal(out("Geldmaat Spaarndam")), true);
});

test("pinopname: alleen geld dat eraf gaat", () => {
  assert.equal(isCashWithdrawal(out("Geldmaat Amsterdam", "Storting", 50)), false);
  assert.equal(isCashWithdrawal(out("Geldmaat Amsterdam", null, 0)), false);
  assert.equal(isCashWithdrawal(out("Geldmaat Amsterdam", null, Number.NaN)), false);
  assert.equal(isCashWithdrawal({ amount: -50 }), false);
  assert.equal(isCashWithdrawal({ counterparty: "  ", description: "", amount: -50 }), false);
});

test("pinopname: geen valse treffers", () => {
  assert.equal(isCashWithdrawal(out("Albert Heijn 1234", "Betaalautomaat cashback")), false);
  assert.equal(isCashWithdrawal(out("Cashback Jumbo")), false);
  assert.equal(isCashWithdrawal(out("Cash back Lidl")), false);
  assert.equal(isCashWithdrawal(out("Makro Cash & Carry Amsterdam")), false);
  assert.equal(isCashWithdrawal(out("Sligro Cash en Carry")), false);
  assert.equal(isCashWithdrawal(out("Cash Converters Utrecht")), false);
  assert.equal(isCashWithdrawal(out("Patmos Restaurant")), false);
  assert.equal(isCashWithdrawal(out("Geldmaatschappij Noord")), false);
  assert.equal(isCashWithdrawal(out("Opnamestudio De Kelder")), false);
  assert.equal(isCashWithdrawal(out("Eigen rekening", "Opname spaarrekening")), false);
  assert.equal(isCashWithdrawal(out("Gea de Vries", "Tikkie etentje")), false);
  assert.equal(isCashWithdrawal(out("GEA DE VRIES")), false);
  assert.equal(isCashWithdrawal(out("Multibanco", "Compra Pingo Doce Lisboa")), false);
  // Oostenrijkse pinbetaling (Bankomatkasse) is geen opname.
  assert.equal(isCashWithdrawal(out("Billa Wien", "Bankomatkasse 1")), false);
  assert.equal(isCashWithdrawal(out("Albert Heijn", "Betaalautomaat")), false);
  assert.equal(isCashWithdrawal(out("Contant")), false);
});

test("contant over: per opname afgekapt op nul, oudste eerst", () => {
  const withdrawals = [
    { id: "w2", amount: -20, bookingDate: "2026-10-05" },
    { id: "w1", amount: -50, bookingDate: "2026-10-01" },
    { id: "w3", amount: -10, bookingDate: "2026-10-07" },
  ];
  const spends = [
    { cashWithdrawalId: "w1", amount: -12.5 },
    { cashWithdrawalId: "w1", amount: -7.5 },
    // Meer uitgegeven dan opgenomen telt niet negatief mee.
    { cashWithdrawalId: "w3", amount: -15 },
    { cashWithdrawalId: null, amount: -99 },
  ];
  const buckets = cashBuckets(withdrawals, spends);
  assert.deepEqual(
    buckets.map((b) => [b.withdrawalId, b.remaining]),
    [
      ["w1", 30],
      ["w2", 20],
      ["w3", 0],
    ],
  );
  assert.equal(cashRemaining(buckets), 50);
  assert.equal(cashRemaining([]), 0);
});

test("contante uitgave: oudste opname eerst, verdeeld als het niet past", () => {
  const buckets = [
    { withdrawalId: "w1", bookingDate: "2026-10-01", remaining: 10 },
    { withdrawalId: "w0", bookingDate: "2026-10-02", remaining: 0 },
    { withdrawalId: "w2", bookingDate: "2026-10-05", remaining: 30 },
  ];
  assert.deepEqual(allocateCashSpend(4.5, buckets), [{ withdrawalId: "w1", amount: 4.5 }]);
  assert.deepEqual(allocateCashSpend(25, buckets), [
    { withdrawalId: "w1", amount: 10 },
    { withdrawalId: "w2", amount: 15 },
  ]);
  assert.deepEqual(allocateCashSpend(40, buckets), [
    { withdrawalId: "w1", amount: 10 },
    { withdrawalId: "w2", amount: 30 },
  ]);
  assert.equal(allocateCashSpend(40.01, buckets), null);
  assert.equal(allocateCashSpend(0, buckets), null);
  assert.equal(allocateCashSpend(-5, buckets), null);
  assert.equal(allocateCashSpend(Number.NaN, buckets), null);
});

test("contant: bedrag en notitie opschonen", () => {
  assert.equal(cashAmount(12.345), 12.35);
  assert.equal(cashAmount(0.004), null);
  assert.equal(cashAmount(0), null);
  assert.equal(cashAmount(-3), null);
  assert.equal(cashAmount("12"), null);
  assert.equal(cashAmount(Infinity), null);
  assert.equal(cashNote("  markt   zaterdag "), "markt zaterdag");
  assert.equal(cashNote("   "), null);
  assert.equal(cashNote(42), null);
  assert.equal([...cashNote("x".repeat(100))!].length, CASH_NOTE_MAX);
});
