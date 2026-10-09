import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_GROUP_MEMBERS,
  canSaveAsGroup,
  cleanMembers,
  nameKey,
  openTotalsByMember,
  sameMembers,
  validateGroup,
} from "../lib/groups/groups";

test("namen worden opgeschoond en ontdubbeld, eerste schrijfwijze blijft", () => {
  assert.deepEqual(cleanMembers(["  Sanne ", "sanne", "Tom  de  Vries", "", "   ", 3, "TOM DE VRIES"]), [
    "Sanne",
    "Tom de Vries",
  ]);
});

test("een naam is maximaal 60 tekens", () => {
  const [name] = cleanMembers(["x".repeat(80)]);
  assert.equal(name.length, 60);
});

test("geen lijst is geen leden", () => {
  assert.deepEqual(cleanMembers("Sanne"), []);
  assert.deepEqual(cleanMembers(null), []);
});

test("nameKey negeert hoofdletters en spaties", () => {
  assert.equal(nameKey("  Jan  Willem "), nameKey("jan willem"));
});

test("validateGroup eist een naam en minstens één lid", () => {
  assert.equal(validateGroup("", ["Sanne"]).ok, false);
  assert.equal(validateGroup("   ", ["Sanne"]).ok, false);
  assert.equal(validateGroup("Huis", ["", "  "]).ok, false);
  assert.equal(validateGroup(42, ["Sanne"]).ok, false);
});

test("validateGroup kort de groepsnaam in tot 40 tekens", () => {
  const result = validateGroup(" " + "a".repeat(50), ["Sanne"]);
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.name.length, 40);
});

test("validateGroup staat maximaal 11 namen toe (na ontdubbelen)", () => {
  const eleven = Array.from({ length: MAX_GROUP_MEMBERS }, (_, i) => `Persoon ${i + 1}`);
  assert.equal(validateGroup("Team", eleven).ok, true);
  assert.equal(validateGroup("Team", [...eleven, "Persoon 12"]).ok, false);
  // dubbelen tellen niet mee
  assert.equal(validateGroup("Team", [...eleven, "persoon 1"]).ok, true);
});

test("sameMembers kijkt niet naar volgorde of hoofdletters", () => {
  assert.equal(sameMembers(["Sanne", "Tom"], ["tom", "SANNE"]), true);
  assert.equal(sameMembers(["Sanne", "Tom"], ["Sanne"]), false);
  assert.equal(sameMembers(["Sanne", ""], ["Sanne"]), true);
});

test("canSaveAsGroup alleen bij ingevulde namen die nog geen groep zijn", () => {
  const groups = [{ members: ["Sanne", "Tom"] }];
  assert.equal(canSaveAsGroup([], groups), false);
  assert.equal(canSaveAsGroup(["", " "], groups), false);
  assert.equal(canSaveAsGroup(["tom", "sanne"], groups), false);
  assert.equal(canSaveAsGroup(["Sanne", "Tom", "Iris"], groups), true);
  assert.equal(canSaveAsGroup(["Iris"], []), true);
  const twelve = Array.from({ length: 12 }, (_, i) => `P${i}`);
  assert.equal(canSaveAsGroup(twelve, []), false);
});

test("openTotalsByMember telt per lid, zonder hoofdletters, op hele centen", () => {
  const shares = [
    { person_name: "sanne", amount: 0.1 },
    { person_name: "Sanne ", amount: 0.2 },
    { person_name: "TOM", amount: 12.5 },
    { person_name: null, amount: 99 },
    { person_name: "Iris", amount: 5 },
  ];
  assert.deepEqual(openTotalsByMember(["Sanne", "Tom", "Noor"], shares), [
    { name: "Sanne", total: 0.3, count: 2 },
    { name: "Tom", total: 12.5, count: 1 },
    { name: "Noor", total: 0, count: 0 },
  ]);
});
