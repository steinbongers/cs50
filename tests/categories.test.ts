import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CATEGORY_HINTS,
  DEFAULT_CATEGORIES,
  hintForName,
  isQuickSuggestionKey,
  MAX_CATEGORY_NAME_LENGTH,
  QUICK_SUGGESTIONS,
} from "../lib/categories/defaults";
import { isCategoryIcon } from "../lib/categories/icons";
import { isCategoryColor } from "../lib/categories/palette";
import { VOORGESCHOTEN_CATEGORY } from "../lib/categories/types";

const COLUMNS = 4;

/** Paren van buren (naast of onder elkaar) met dezelfde kleur in een raster van `columns` kolommen. */
function sameColorNeighbours(colors: readonly string[], columns: number): Array<[number, number]> {
  const clashes: Array<[number, number]> = [];
  colors.forEach((color, i) => {
    const right = i + 1;
    if (right < colors.length && right % columns !== 0 && colors[right] === color) clashes.push([i, right]);
    const below = i + columns;
    if (below < colors.length && colors[below] === color) clashes.push([i, below]);
  });
  return clashes;
}

test("de standaardset heeft 13 potjes met unieke sleutels", () => {
  assert.equal(DEFAULT_CATEGORIES.length, 13);
  const keys = DEFAULT_CATEGORIES.map((c) => c.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("de volgorde klopt met het besluit en Overig staat als laatste", () => {
  assert.deepEqual(
    DEFAULT_CATEGORIES.map((c) => c.name),
    [
      "Boodschappen",
      "Eten & drinken",
      "Vervoer",
      "Wonen",
      "Abonnementen",
      "Zorg & verzekeringen",
      "Kleding & verzorging",
      "Uitgaan & vrije tijd",
      "Vakantie",
      "Cadeaus & goede doelen",
      "Sparen & beleggen",
      "Inkomen",
      "Overig",
    ],
  );
  assert.equal(DEFAULT_CATEGORIES.at(-1)?.key, "overig");
});

test("bestaande sleutels blijven bestaan", () => {
  const keys = new Set(DEFAULT_CATEGORIES.map((c) => c.key));
  for (const key of ["boodschappen", "uit-eten", "vervoer", "wonen", "abonnementen", "kleding", "uitgaan", "sparen", "inkomen", "overig"]) {
    assert.ok(keys.has(key), key);
  }
});

test("precies één potje is inkomend geld", () => {
  const income = DEFAULT_CATEGORIES.filter((c) => c.isIncome);
  assert.equal(income.length, 1);
  assert.equal(income[0].key, "inkomen");
});

test("Voorgeschoten zit niet in de standaardset", () => {
  assert.ok(!DEFAULT_CATEGORIES.some((c) => c.name === VOORGESCHOTEN_CATEGORY.name));
});

test("alle namen passen binnen de maximale lengte", () => {
  for (const c of DEFAULT_CATEGORIES) {
    assert.ok(c.name.length > 0 && c.name.length <= MAX_CATEGORY_NAME_LENGTH, c.name);
  }
});

test("alle iconen en kleuren zijn geldig", () => {
  for (const c of DEFAULT_CATEGORIES) {
    assert.ok(isCategoryIcon(c.icon), `${c.key}: icoon ${c.icon}`);
    assert.ok(isCategoryColor(c.color), `${c.key}: kleur ${c.color}`);
  }
});

test("geen buren met dezelfde kleur in een raster van 4 kolommen", () => {
  const colors = DEFAULT_CATEGORIES.map((c) => c.color);
  assert.deepEqual(sameColorNeighbours(colors, COLUMNS), []);
});

test("ook met een Terugbetaling-tegel ervoor (verschuiving van 1) geen gelijke buren", () => {
  const colors = [VOORGESCHOTEN_CATEGORY.color, ...DEFAULT_CATEGORIES.map((c) => c.color)];
  assert.deepEqual(sameColorNeighbours(colors, COLUMNS), []);
});

test("de burencheck vindt echt gelijke buren", () => {
  assert.deepEqual(sameColorNeighbours(["groen", "groen"], COLUMNS), [[0, 1]]);
  assert.deepEqual(sameColorNeighbours(["groen", "a", "b", "c", "groen"], COLUMNS), [[0, 4]]);
  // Einde van een rij en begin van de volgende zijn geen buren.
  assert.deepEqual(sameColorNeighbours(["a", "b", "c", "groen", "groen"], COLUMNS), []);
});

test("de snelle suggesties zijn geldig en botsen niet met de standaardset", () => {
  assert.deepEqual(
    QUICK_SUGGESTIONS.map((s) => s.key),
    ["studie", "huisdier", "kinderen"],
  );
  const defaultNames = new Set(DEFAULT_CATEGORIES.map((c) => c.name.toLowerCase()));
  for (const s of QUICK_SUGGESTIONS) {
    assert.ok(isCategoryIcon(s.icon), `${s.key}: icoon ${s.icon}`);
    assert.ok(isCategoryColor(s.color), `${s.key}: kleur ${s.color}`);
    assert.ok(s.name.length <= MAX_CATEGORY_NAME_LENGTH);
    assert.ok(!defaultNames.has(s.name.toLowerCase()), s.name);
    assert.ok(isQuickSuggestionKey(s.key));
  }
  assert.ok(!isQuickSuggestionKey("sport"));
  assert.ok(!isQuickSuggestionKey(null));
});

test("hulpregels horen bij bestaande standaardpotjes", () => {
  const keys = new Set(DEFAULT_CATEGORIES.map((c) => c.key));
  for (const key of Object.keys(CATEGORY_HINTS)) assert.ok(keys.has(key), key);
});

test("hintForName zoekt hoofdletterongevoelig op naam", () => {
  assert.equal(hintForName("Vervoer"), "Ook auto, brandstof en parkeren");
  assert.equal(hintForName("  zorg & VERZEKERINGEN "), "Ook zorgverzekering en andere verzekeringen");
  assert.equal(hintForName("Boodschappen"), null);
  assert.equal(hintForName("Sport"), null);
  assert.equal(hintForName(""), null);
});
