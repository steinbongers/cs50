import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compactEuro,
  cumulativeTitle,
  fixedTitle,
  flowTitle,
  incomeCompareText,
  netLine,
  shortMonth,
  weekdayTitle,
} from "../components/insights/insight-copy";

const NBSP = " ";
const MINUS = "−";

test("compacte bedragen voor assen en kleine labels", () => {
  assert.equal(compactEuro(230), `€${NBSP}230`);
  assert.equal(compactEuro(1250), `€${NBSP}1,3k`);
  assert.equal(compactEuro(2000), `€${NBSP}2k`);
  assert.equal(compactEuro(-40), `${MINUS}${NBSP}€${NBSP}40`);
  assert.equal(compactEuro(-0.3), `€${NBSP}0`);
  assert.equal(shortMonth("oktober"), "okt");
});

test("inkomsten min uitgaven: neutraal, over of meer uitgegeven", () => {
  assert.equal(netLine(230.4), `Inkomsten ${MINUS} uitgaven: €${NBSP}230 over`);
  assert.equal(netLine(0), `Inkomsten ${MINUS} uitgaven: €${NBSP}0 over`);
  assert.equal(netLine(-40), `€${NBSP}40 meer uitgegeven dan binnenkwam`);
});

test("inkomsten tegenover je gemiddelde", () => {
  assert.deepEqual(incomeCompareText({ current: 0, average: null, periodsUsed: 0 }, true), {
    text: "Nog geen eerdere maanden om mee te vergelijken.",
    basis: null,
  });
  assert.deepEqual(incomeCompareText({ current: 1900, average: 1850, periodsUsed: 3 }, false), { text: "Net als je gemiddelde", basis: null });
  assert.deepEqual(incomeCompareText({ current: 1500, average: 1850, periodsUsed: 1 }, true), {
    text: `€${NBSP}350 minder dan je gemiddelde tot nu toe`,
    basis: "Op basis van 1 maand",
  });
});

test("koppen zeggen de conclusie", () => {
  assert.equal(flowTitle({ income: 1800, spent: 1600, net: 200, periods: 3 }, 0), `Gemiddeld hou je €${NBSP}200 per maand over`);
  assert.equal(flowTitle(null, -50), `Deze maand gaf je tot nu toe €${NBSP}50 meer uit dan er binnenkwam`);
  assert.equal(cumulativeTitle(380, 500, "oktober"), `Je gaf in oktober €${NBSP}120 minder uit dan gemiddeld`);
  assert.equal(cumulativeTitle(505, 500, "oktober"), "Je zit precies rond je gemiddelde");
  assert.equal(cumulativeTitle(80, null, "oktober"), `Je gaf in oktober tot nu toe €${NBSP}80 uit`);
  assert.equal(weekdayTitle(5), "Op zaterdag geef je het meest uit");
  assert.equal(fixedTitle(0.384), "Vaste lasten zijn 38% van je uitgaven");
});
