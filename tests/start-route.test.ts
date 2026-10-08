import assert from "node:assert/strict";
import { test } from "node:test";
import { startRoute, startTabForPath } from "../lib/start-route";

test("zonder sessie naar welkom, ook als er kaartjes zouden liggen", () => {
  assert.equal(startRoute({ signedIn: false, onboardingDone: false, openCount: 0 }), "/welkom");
  assert.equal(startRoute({ signedIn: false, onboardingDone: true, openCount: 5 }), "/welkom");
});

test("onboarding niet af gaat voor kaartjes", () => {
  assert.equal(startRoute({ signedIn: true, onboardingDone: false, openCount: 0 }), "/onboarding");
  assert.equal(startRoute({ signedIn: true, onboardingDone: false, openCount: 5 }), "/onboarding");
});

test("5 kaartjes: naar swipen", () => {
  assert.equal(startRoute({ signedIn: true, onboardingDone: true, openCount: 5 }), "/swipen");
  assert.equal(startRoute({ signedIn: true, onboardingDone: true, openCount: 1 }), "/swipen");
});

test("0 kaartjes: naar overzicht", () => {
  assert.equal(startRoute({ signedIn: true, onboardingDone: true, openCount: 0 }), "/overzicht");
});

test("mislukte of vreemde telling: naar overzicht", () => {
  assert.equal(startRoute({ signedIn: true, onboardingDone: true, openCount: null }), "/overzicht");
  assert.equal(startRoute({ signedIn: true, onboardingDone: true, openCount: Number.NaN }), "/overzicht");
  assert.equal(startRoute({ signedIn: true, onboardingDone: true, openCount: -3 }), "/overzicht");
});

test("starttab volgt uit het pad", () => {
  assert.equal(startTabForPath("/swipen"), "swipen");
  assert.equal(startTabForPath("/overzicht"), "overzicht");
  assert.equal(startTabForPath("/overzicht/iets"), "overzicht");
  assert.equal(startTabForPath("/instellingen"), "anders");
  assert.equal(startTabForPath("/swipenx"), "anders");
});
