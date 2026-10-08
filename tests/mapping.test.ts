import assert from "node:assert/strict";
import { test } from "node:test";
import { hashIban, mapTransaction, maskIban, pickBalance } from "../lib/bank/mapping";
import type { EbTransaction } from "../lib/enablebanking/types";

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
