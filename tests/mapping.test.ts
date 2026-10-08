import assert from "node:assert/strict";
import { test } from "node:test";
import { hashIban, mapTransaction, maskIban, pickBalance } from "../lib/bank/mapping";
import type { EbTransaction } from "../lib/enablebanking/types";
import { dedupeHash } from "../lib/transactions/dedupe";

const ctx = { userId: "u", accountId: "a", ownIbanHashes: new Set([hashIban("NL91ABNA0417164300")!]) };

const pin: EbTransaction = {
  entry_reference: "2026100812345",
  transaction_amount: { currency: "EUR", amount: "23.45" },
  creditor: { name: "ALBERT HEIJN 1234 AMSTERDAM NLD" },
  credit_debit_indicator: "DBIT",
  status: "BOOK",
  booking_date: "2026-10-08",
  balance_after_transaction: { currency: "EUR", amount: "1053.58" },
  remittance_information: ["Pasvolgnr: 003 08-10-2026 14:32 Transactie: 1A2B3C Term: 12345678"],
};

test("afschrijving wordt negatief met opgeschoonde tegenpartij, tijd en saldo", () => {
  const row = mapTransaction(pin, ctx)!;
  assert.equal(row.amount, -23.45);
  assert.equal(row.counterparty, "Albert Heijn Amsterdam");
  assert.equal(row.raw_counterparty, "ALBERT HEIJN 1234 AMSTERDAM NLD");
  assert.equal(row.booking_time, "14:32:00");
  assert.equal(row.balance_after, 1053.58);
  assert.equal(row.description, null);
  assert.equal(row.dedupe_hash, "ext:2026100812345");
  assert.equal(row.is_internal_transfer, false);
});

test("bijschrijving gebruikt de verzender als tegenpartij", () => {
  const row = mapTransaction(
    {
      transaction_amount: { currency: "EUR", amount: "12.50" },
      debtor: { name: "S. de Vries" },
      credit_debit_indicator: "CRDT",
      status: "BOOK",
      booking_date: "2026-10-06",
      remittance_information: ["Tikkie van Sanne: etentje"],
    },
    ctx,
  )!;
  assert.equal(row.amount, 12.5);
  assert.equal(row.counterparty, "S. de Vries");
  assert.equal(row.description, "Tikkie van Sanne: etentje");
  assert.match(row.dedupe_hash, /^h:/);
});

test("zonder bank-ID telt de rekening mee in de ontdubbelsleutel", () => {
  const twin: EbTransaction = {
    transaction_amount: { currency: "EUR", amount: "2.50" },
    creditor: { name: "NS Reizigers" },
    credit_debit_indicator: "DBIT",
    status: "BOOK",
    booking_date: "2026-10-06",
    remittance_information: ["Reis"],
  };
  const a = mapTransaction(twin, ctx)!;
  const b = mapTransaction(twin, { ...ctx, accountId: "b" })!;
  const again = mapTransaction(twin, ctx)!;
  assert.match(a.dedupe_hash, /^h:/);
  assert.equal(a.dedupe_hash, again.dedupe_hash);
  assert.notEqual(a.dedupe_hash, b.dedupe_hash);
});

test("zonder bank-ID maakt het saldo erna twee gelijke betalingen uniek", () => {
  const twice: EbTransaction = {
    transaction_amount: { currency: "EUR", amount: "3.20" },
    creditor: { name: "Koffiebar" },
    credit_debit_indicator: "DBIT",
    status: "BOOK",
    booking_date: "2026-10-06",
    balance_after_transaction: { currency: "EUR", amount: "100.00" },
  };
  const first = mapTransaction(twice, ctx)!;
  const second = mapTransaction({ ...twice, balance_after_transaction: { currency: "EUR", amount: "96.80" } }, ctx)!;
  const noBalance = mapTransaction({ ...twice, balance_after_transaction: undefined }, ctx)!;
  assert.notEqual(first.dedupe_hash, second.dedupe_hash);
  assert.notEqual(first.dedupe_hash, noBalance.dedupe_hash);
  assert.equal(noBalance.balance_after, null);
  // Zelfde invoer met een andere spelling van de omschrijving blijft gelijk.
  assert.equal(
    dedupeHash({ bookingDate: "2026-10-06", amount: -3.2, counterparty: "Koffiebar", description: "Latte  macchiato", accountId: "a", balanceAfter: 100 }),
    dedupeHash({ bookingDate: "2026-10-06", amount: -3.2, counterparty: "KOFFIEBAR", description: "latte macchiato", accountId: "a", balanceAfter: 100 }),
  );
  // Met een bank-ID doen rekening en saldo er niet toe.
  assert.equal(dedupeHash({ externalId: "x1", bookingDate: "2026-10-06", amount: -3.2, accountId: "a" }), "ext:x1");
});

test("overboeking naar eigen rekening wordt herkend", () => {
  const row = mapTransaction(
    {
      transaction_amount: { currency: "EUR", amount: "100.00" },
      creditor: { name: "Eigen spaarrekening" },
      creditor_account: { iban: "NL91 ABNA 0417 1643 00" },
      credit_debit_indicator: "DBIT",
      status: "BOOK",
      booking_date: "2026-10-01",
    },
    ctx,
  )!;
  assert.equal(row.is_internal_transfer, true);
});

test("niet-geboekte transacties worden overgeslagen", () => {
  assert.equal(mapTransaction({ ...pin, status: "PDNG" }, ctx), null);
  assert.equal(mapTransaction({ ...pin, booking_date: null, value_date: null, transaction_date: null }, ctx), null);
});

test("IBAN wordt gemaskeerd en gehasht, nooit bewaard", () => {
  assert.equal(maskIban("NL91ABNA0417164300"), "NL** **** 4300");
  assert.equal(maskIban("NL91 ABNA 0417 1643 00"), "NL** **** 4300");
  assert.equal(maskIban(""), null);
  assert.equal(hashIban("NL91ABNA0417164300"), hashIban("nl91 abna 0417 1643 00"));
});

test("saldo: beschikbaar saldo gaat voor", () => {
  assert.equal(
    pickBalance([
      { balance_type: "CLBD", balance_amount: { currency: "EUR", amount: "100.00" } },
      { balance_type: "CLAV", balance_amount: { currency: "EUR", amount: "90.00" } },
    ]),
    90,
  );
  assert.equal(pickBalance([]), null);
});
