import assert from "node:assert/strict";
import { test } from "node:test";
import { LOCK_AFTER_MS, appLockScript, stateOnHide, stateOnReturn } from "../lib/native/app-lock";
import { bearerToken, generateWidgetToken, hashWidgetToken } from "../lib/native/widget-token";

test("widgetsleutel: lang, url-veilig en elke keer anders", () => {
  const a = generateWidgetToken();
  const b = generateWidgetToken();
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a, b);
});

test("widgetsleutel: hash is sha256 in hex en stabiel", () => {
  assert.equal(hashWidgetToken("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(hashWidgetToken("x".repeat(43)), hashWidgetToken("x".repeat(43)));
});

test("bearer: alleen een echte widgetsleutel telt", () => {
  const token = generateWidgetToken();
  assert.equal(bearerToken(`Bearer ${token}`), token);
  assert.equal(bearerToken(`  Bearer   ${token} `), token);
  assert.equal(bearerToken(null), null);
  assert.equal(bearerToken(""), null);
  assert.equal(bearerToken(token), null);
  assert.equal(bearerToken("Bearer kort"), null);
  assert.equal(bearerToken(`Basic ${token}`), null);
  assert.equal(bearerToken(`Bearer ${token}' or 1=1`), null);
});

test("slot: kort weg haalt de afdekking weg, langer dan een minuut vraagt Face ID", () => {
  assert.equal(stateOnReturn("shield", 5_000), null);
  assert.equal(stateOnReturn("shield", LOCK_AFTER_MS), null);
  assert.equal(stateOnReturn("shield", LOCK_AFTER_MS + 1), "locked");
});

test("slot: een slot dat op ontgrendelen wacht, blijft staan", () => {
  assert.equal(stateOnReturn("locked", 0), "locked");
  assert.equal(stateOnReturn("locked", LOCK_AFTER_MS * 10), "locked");
  assert.equal(stateOnReturn(null, LOCK_AFTER_MS * 10), null);
});

test("slot: naar de achtergrond dekt alleen af als het slot aan staat", () => {
  assert.equal(stateOnHide(null, true), "shield");
  assert.equal(stateOnHide(null, false), null);
  assert.equal(stateOnHide("locked", true), "locked");
  assert.equal(stateOnHide("locked", false), "locked");
});

function runLockScript(opts: { native: boolean; plugin: boolean; stored: string | null }) {
  const attributes = new Map<string, string>();
  const window = {
    Capacitor: opts.native
      ? { isNativePlatform: () => true, isPluginAvailable: (name: string) => opts.plugin && name === "BiometricLock" }
      : undefined,
  };
  const localStorage = { getItem: (key: string) => (key === "app_lock" ? opts.stored : null) };
  const document = { documentElement: { setAttribute: (k: string, v: string) => attributes.set(k, v) } };
  new Function("window", "localStorage", "document", appLockScript)(window, localStorage, document);
  return attributes.get("data-app-lock") ?? null;
}

test("slotscript: zet het slot alleen in de app, met plugin, als het aan staat", () => {
  assert.equal(runLockScript({ native: true, plugin: true, stored: "on" }), "locked");
  assert.equal(runLockScript({ native: true, plugin: true, stored: null }), null);
  assert.equal(runLockScript({ native: true, plugin: false, stored: "on" }), null);
  assert.equal(runLockScript({ native: false, plugin: false, stored: "on" }), null);
});
