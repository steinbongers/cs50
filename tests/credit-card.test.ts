import assert from "node:assert/strict";
import { test } from "node:test";
import { isCreditCardSettlement } from "../lib/transactions/credit-card";

const out = (counterparty: string | null, description: string | null = null, amount = -450) => ({
  counterparty,
  description,
  amount,
});

test("creditcard: uitgevers en bankproducten", () => {
  assert.equal(isCreditCardSettlement(out("International Card Services BV", "Incasso klantnr 1234567")), true);
  assert.equal(isCreditCardSettlement(out("ICS", "Afrekening oktober")), true);
  assert.equal(isCreditCardSettlement(out("ICS CARDS")), true);
  assert.equal(isCreditCardSettlement(out("ICS-cards", null)), true);
  assert.equal(isCreditCardSettlement(out("American Express Europe S.A.", "Incasso")), true);
  assert.equal(isCreditCardSettlement(out("AMEX")), true);
  assert.equal(isCreditCardSettlement(out("Rabobank", "Rabo Card afrekening")), true);
  assert.equal(isCreditCardSettlement(out("RaboCard")), true);
  assert.equal(isCreditCardSettlement(out("ING Bank N.V.", "ING Creditcard afrekening september")), true);
  assert.equal(isCreditCardSettlement(out("ABN AMRO Bank", "ABN AMRO Creditcard")), true);
  assert.equal(isCreditCardSettlement(out("Onbekende tegenpartij", "Afschrijving credit card")), true);
  // ABN AMRO: tegenpartij leeg, alles in de ruwe omschrijving.
  assert.equal(
    isCreditCardSettlement({ counterparty: null, rawDescription: "SEPA Incasso algemeen doorlopend Naam: ICS Machtiging: 12", amount: -120 }),
    true,
  );
});

test("creditcard: Mastercard en Visa alleen met een afrekening", () => {
  assert.equal(isCreditCardSettlement(out("Mastercard", "Maandafrekening")), true);
  assert.equal(isCreditCardSettlement(out("Visa", "Incasso rekeningoverzicht")), true);
  assert.equal(isCreditCardSettlement(out("Visa Vintage Amsterdam")), false);
  assert.equal(isCreditCardSettlement(out("Albert Heijn 1234", "Betaalautomaat Apple Pay Mastercard")), false);
  assert.equal(isCreditCardSettlement(out("Visa Hair & Beauty", "Betaalautomaat 14:02")), false);
});

test("creditcard: geen valse treffers", () => {
  assert.equal(isCreditCardSettlement(out("Physics Bookshop")), false);
  assert.equal(isCreditCardSettlement(out("Ics Bakkerij")), false);
  assert.equal(isCreditCardSettlement(out("Kaartjeshuis", "Cadeaukaart")), false);
  assert.equal(isCreditCardSettlement(out("Card Shop Utrecht")), false);
  assert.equal(isCreditCardSettlement(out("Jumbo Utrecht")), false);
});

test("creditcard: alleen geld dat eraf gaat", () => {
  assert.equal(isCreditCardSettlement(out("International Card Services", "Teruggave", 25)), false);
  assert.equal(isCreditCardSettlement(out("ICS", null, 0)), false);
  assert.equal(isCreditCardSettlement(out("ICS", null, Number.NaN)), false);
  assert.equal(isCreditCardSettlement({ amount: -50 }), false);
  assert.equal(isCreditCardSettlement({ counterparty: "  ", description: "", amount: -50 }), false);
});
