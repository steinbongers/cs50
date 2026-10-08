import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanCounterparty, cleanDescription, extractTime } from "../lib/transactions/clean";
import { currentPeriod, salaryDateInMonth } from "../lib/periods";

test("tegenpartij: filiaalnummer en landcode weg, plaatsnaam blijft", () => {
  assert.equal(cleanCounterparty("ALBERT HEIJN 1234 AMSTERDAM NLD"), "Albert Heijn Amsterdam");
});

test("tegenpartij: betaalverwerker-prefix weg", () => {
  assert.equal(cleanCounterparty("CCV*Cafe De Zwart"), "Cafe De Zwart");
  assert.equal(cleanCounterparty("SumUp *Bakkerij Bart"), "Bakkerij Bart");
  assert.equal(cleanCounterparty("Zettle_*Koffiebar Noord"), "Koffiebar Noord");
});

test("tegenpartij: afkortingen blijven in kapitalen", () => {
  assert.equal(cleanCounterparty("NS REIZIGERS"), "NS Reizigers");
  assert.equal(cleanCounterparty("HEMA 0432 UTRECHT"), "HEMA Utrecht");
});

test("tegenpartij: gemengde tekst blijft zoals hij is", () => {
  assert.equal(cleanCounterparty("Thuisbezorgd.nl"), "Thuisbezorgd.nl");
  assert.equal(cleanCounterparty("Woningstichting Rochdale"), "Woningstichting Rochdale");
});

test("tegenpartij: leeg wordt onbekend", () => {
  assert.equal(cleanCounterparty(""), "Onbekende tegenpartij");
  assert.equal(cleanCounterparty(null), "Onbekende tegenpartij");
});

test("omschrijving: ING pinregel wordt leeg", () => {
  assert.equal(cleanDescription("Pasvolgnr: 003 08-10-2026 14:32 Transactie: 1A2B3C Term: 12345678"), null);
});

test("omschrijving: ABN BEA-regel wordt leeg", () => {
  assert.equal(cleanDescription("BEA, Betaalpas, Albert Heijn 1234 AMS,PAS123, NR:12345678, 08.10.26/14.32, AMSTERDAM"), "Albert Heijn 1234 AMS, PAS123, AMSTERDAM");
});

test("omschrijving: overboeking behoudt de tekst die ertoe doet", () => {
  assert.equal(cleanDescription("Naam: Sanne de Vries Omschrijving: Etentje vrijdag IBAN: NL91ABNA0417164300 Kenmerk: 12345"), "Sanne de Vries Etentje vrijdag");
});

test("omschrijving: tikkie-tekst blijft leesbaar", () => {
  assert.equal(cleanDescription("Tikkie van Daan: boodschappen"), "Tikkie van Daan: boodschappen");
});

test("tijd: ING, ABN en ISO", () => {
  assert.equal(extractTime("Pasvolgnr: 003 08-10-2026 14:32 Transactie: X"), "14:32");
  assert.equal(extractTime("BEA, Betaalpas, 08.10.26/09.05, AMSTERDAM"), "09:05");
  assert.equal(extractTime("Transactiedatum: 2026-10-08 23:59:11"), "23:59");
  assert.equal(extractTime("Huur oktober"), null);
});

test("salarisdag in weekend schuift naar vrijdag", () => {
  // 25 oktober 2026 is een zondag -> vrijdag 23 oktober
  assert.equal(salaryDateInMonth(2026, 9, 25).getDate(), 23);
  // 31 in februari -> 28
  assert.equal(salaryDateInMonth(2026, 1, 31).getDate(), 27); // 28 feb 2026 is zaterdag -> vrijdag 27
});

test("periode loopt van salarisdag tot salarisdag", () => {
  const p = currentPeriod(25, new Date(2026, 9, 8)); // 8 oktober 2026
  assert.equal(p.startISO, "2026-09-25");
  assert.equal(p.endISO, "2026-10-23");
  assert.equal(p.label, "sinds 25 september");
});

test("zonder salarisdag is de periode de kalendermaand", () => {
  const p = currentPeriod(null, new Date(2026, 9, 8));
  assert.equal(p.startISO, "2026-10-01");
  assert.equal(p.endISO, "2026-11-01");
  assert.equal(p.label, "oktober");
});

test("geneste verwerkers en tegenpartijen zonder naam", () => {
  assert.equal(cleanCounterparty("1234567 NLD"), "Onbekende tegenpartij");
  assert.ok(!/ccv/i.test(cleanCounterparty("CCV*CCV*  PAY.NL*  BAKKERIJ BART")));
});
