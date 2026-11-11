import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ACTION_TOKEN_TTL_MS, createActionToken, verifyActionToken } from "../lib/native/action-token";
import { deviceKeyExpiry, generateDeviceKey, hashDeviceKey, isApnsToken, isDeviceExpired, isInstallationId } from "../lib/native/device-key";
import { pickSuggestion, topCategories } from "../lib/native/suggest";
import { cleanWalletMerchant, parseWalletAmount, similarMerchant } from "../lib/native/wallet";
import { inMatchWindow, matchWalletPayments } from "../lib/native/wallet-match";
import { bearerToken } from "../lib/native/widget-token";
import { isQuietHour, manyPaymentsMessage, paymentMessage, showDetails } from "../lib/push/payment-copy";
import { syncRunsPerDay } from "../lib/bank/schedule";

const SECRET = "s".repeat(40);
const U = "11111111-1111-1111-1111-111111111111";
const T = "22222222-2222-2222-2222-222222222222";
const C = "33333333-3333-3333-3333-333333333333";

// --- Bedrag en winkel uit Opdrachten ---

test("wallet: bedrag in allerlei schrijfwijzen", () => {
  assert.equal(parseWalletAmount("€ 4,50"), 4.5);
  assert.equal(parseWalletAmount("€4.50"), 4.5);
  assert.equal(parseWalletAmount("4,50 EUR"), 4.5);
  assert.equal(parseWalletAmount("-4,50"), 4.5);
  assert.equal(parseWalletAmount("1.234,56"), 1234.56);
  assert.equal(parseWalletAmount("1,234.56"), 1234.56);
  assert.equal(parseWalletAmount("12"), 12);
  assert.equal(parseWalletAmount("€ 3,2"), 3.2);
  assert.equal(parseWalletAmount(7.999), 8);
});

test("wallet: onleesbaar, nul, te groot of andere valuta telt niet", () => {
  for (const bad of ["", "abc", "€ 0,00", "$ 4.50", "4.50 USD", "£3", "99999,00", "1,2,3", null, undefined, {}, "4,50; drop"]) {
    assert.equal(parseWalletAmount(bad), null, String(bad));
  }
});

test("wallet: winkelnaam opgeschoond, leeg wordt null", () => {
  assert.equal(cleanWalletMerchant("ALBERT HEIJN 1234"), "Albert Heijn");
  assert.equal(cleanWalletMerchant("CCV*Cafe De Zwart\n"), "Cafe De Zwart");
  assert.equal(cleanWalletMerchant("   "), null);
  assert.equal(cleanWalletMerchant(42), null);
  assert.ok((cleanWalletMerchant("x".repeat(500)) ?? "").length <= 80);
});

test("wallet: winkelnamen vergelijken", () => {
  assert.ok(similarMerchant("Albert Heijn", "AH to go 5812 Amsterdam"));
  assert.ok(similarMerchant("Albert Heijn", "ALBERT HEIJN 1234 AMSTERDAM NLD"));
  assert.ok(similarMerchant("Jumbo", "Jumbo Supermarkten"));
  assert.ok(similarMerchant("AlbertHeijn", "Albert Heijn"));
  assert.ok(!similarMerchant("Albert Heijn", "Jumbo"));
  assert.ok(!similarMerchant("Station Amsterdam", "Kiosk Amsterdam"));
  assert.ok(!similarMerchant(null, "Jumbo"));
});

// --- Ontdubbelen Apple Pay tegen bank ---

test("ontdubbelen: zelfde bedrag, winkel lijkt, bank een dag later", () => {
  const wallet = [{ id: "w1", booking_date: "2026-11-10", amount: -4.5, merchant: "Albert Heijn" }];
  const bank = [{ id: "b1", booking_date: "2026-11-11", amount: -4.5, counterparty: "AH to go Amsterdam" }];
  assert.deepEqual(matchWalletPayments(bank, wallet), [{ bankId: "b1", walletId: "w1" }]);
});

test("ontdubbelen: ander bedrag of te ver weg is geen dubbel", () => {
  const wallet = [{ id: "w1", booking_date: "2026-11-10", amount: -4.5, merchant: "Albert Heijn" }];
  assert.deepEqual(matchWalletPayments([{ id: "b1", booking_date: "2026-11-10", amount: -4.51, counterparty: "Albert Heijn" }], wallet), []);
  assert.deepEqual(matchWalletPayments([{ id: "b1", booking_date: "2026-11-15", amount: -4.5, counterparty: "Albert Heijn" }], wallet), []);
  assert.ok(inMatchWindow("2026-11-10", "2026-11-13"));
  assert.ok(!inMatchWindow("2026-11-10", "2026-11-14"));
  assert.ok(inMatchWindow("2026-11-10", "2026-11-09"));
});

test("ontdubbelen: andere schrijfwijze telt alleen als het aan beide kanten de enige is", () => {
  const wallet = [{ id: "w1", booking_date: "2026-11-10", amount: -12, merchant: "Bakkerij" }];
  const one = [{ id: "b1", booking_date: "2026-11-10", amount: -12, counterparty: "SumUp Jansen" }];
  assert.deepEqual(matchWalletPayments(one, wallet), [{ bankId: "b1", walletId: "w1" }]);
  const two = [...one, { id: "b2", booking_date: "2026-11-11", amount: -12, counterparty: "Kapper" }];
  assert.deepEqual(matchWalletPayments(two, wallet), []);
});

test("ontdubbelen: twee gelijke koffies worden twee paren, niet één", () => {
  const wallet = [
    { id: "w1", booking_date: "2026-11-10", amount: -3.2, merchant: "Starbucks" },
    { id: "w2", booking_date: "2026-11-10", amount: -3.2, merchant: "Starbucks" },
  ];
  const bank = [
    { id: "b1", booking_date: "2026-11-11", amount: -3.2, counterparty: "STARBUCKS 123" },
    { id: "b2", booking_date: "2026-11-11", amount: -3.2, counterparty: "STARBUCKS 123" },
  ];
  const result = matchWalletPayments(bank, wallet);
  assert.equal(result.length, 2);
  assert.equal(new Set(result.map((m) => m.walletId)).size, 2);
  assert.equal(new Set(result.map((m) => m.bankId)).size, 2);
});

test("ontdubbelen: winkel die lijkt gaat voor de enige kandidaat", () => {
  const wallet = [
    { id: "w1", booking_date: "2026-11-10", amount: -5, merchant: "Jumbo" },
    { id: "w2", booking_date: "2026-11-10", amount: -5, merchant: "Kruidvat" },
  ];
  const bank = [{ id: "b1", booking_date: "2026-11-11", amount: -5, counterparty: "Kruidvat 7781" }];
  assert.deepEqual(matchWalletPayments(bank, wallet), [{ bankId: "b1", walletId: "w2" }]);
});

// --- Voorstel ---

test("voorstel: het potje dat je het vaakst koos bij deze winkel", () => {
  const allowed = new Set(["boodschappen", "uit-eten"]);
  const history = [
    { category_id: "boodschappen", counterparty: "Albert Heijn Amsterdam", wallet_merchant: null, categorized_at: "2026-10-01T10:00:00Z" },
    { category_id: "boodschappen", counterparty: "Albert Heijn", wallet_merchant: null, categorized_at: "2026-10-02T10:00:00Z" },
    { category_id: "uit-eten", counterparty: "Albert Heijn", wallet_merchant: null, categorized_at: "2026-11-01T10:00:00Z" },
    { category_id: "uit-eten", counterparty: "Jumbo", wallet_merchant: null, categorized_at: "2026-11-01T10:00:00Z" },
  ];
  assert.equal(pickSuggestion(history, "Albert Heijn", allowed), "boodschappen");
});

test("voorstel: gelijkspel wint de laatste keuze; via de Wallet-naam ook", () => {
  const allowed = new Set(["a", "b"]);
  const history = [
    { category_id: "a", counterparty: "XYZ BV", wallet_merchant: "Cafe Noord", categorized_at: "2026-10-01T10:00:00Z" },
    { category_id: "b", counterparty: "Cafe Noord", wallet_merchant: null, categorized_at: "2026-11-01T10:00:00Z" },
  ];
  assert.equal(pickSuggestion(history, "Cafe Noord", allowed), "b");
});

test("voorstel: geen geschiedenis, of alleen gearchiveerde potjes: geen voorstel", () => {
  const history = [{ category_id: "oud", counterparty: "Jumbo", wallet_merchant: null, categorized_at: null }];
  assert.equal(pickSuggestion(history, "Jumbo", new Set(["nieuw"])), null);
  assert.equal(pickSuggestion([], "Jumbo", new Set(["nieuw"])), null);
  assert.equal(pickSuggestion(history, "", new Set(["oud"])), null);
});

test("widget: meestgebruikte potjes eerst, aangevuld in eigen volgorde", () => {
  const used = [{ category_id: "c" }, { category_id: "c" }, { category_id: "b" }, { category_id: "weg" }];
  assert.deepEqual(topCategories(used, ["a", "b", "c", "d", "e"], 4), ["c", "b", "a", "d"]);
  assert.deepEqual(topCategories([], ["a", "b"], 4), ["a", "b"]);
});

// --- Sleutels ---

test("apparaatsleutel: vorm, hash en verlopen", () => {
  const key = generateDeviceKey();
  assert.match(key, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(bearerToken(`Bearer ${key}`), key);
  assert.equal(hashDeviceKey(key).length, 64);
  const now = new Date("2026-11-11T12:00:00Z");
  const expiry = deviceKeyExpiry(now);
  assert.ok(!isDeviceExpired(expiry, now));
  assert.ok(isDeviceExpired(expiry, new Date("2026-12-12T12:00:00Z")));
  assert.ok(isDeviceExpired("onzin", now));
  assert.ok(isInstallationId("6F9619FF-8B86-D011-B42D-00C04FC964FF"));
  assert.ok(!isInstallationId("../../etc"));
  assert.ok(isApnsToken("a".repeat(64)));
  assert.ok(!isApnsToken("zz"));
});

test("actiesleutel: geldig, en alleen voor deze betaling en dit potje", () => {
  const now = Date.parse("2026-11-11T12:00:00Z");
  const token = createActionToken({ userId: U, transactionId: T, categoryId: C }, SECRET, now);
  const claims = verifyActionToken(token, SECRET, now + 1000);
  assert.deepEqual(claims && { u: claims.u, t: claims.t, c: claims.c }, { u: U, t: T, c: C });
});

test("actiesleutel: verlopen, vervalst of ander geheim telt niet", () => {
  const now = Date.parse("2026-11-11T12:00:00Z");
  const token = createActionToken({ userId: U, transactionId: T, categoryId: C }, SECRET, now);
  assert.equal(verifyActionToken(token, SECRET, now + ACTION_TOKEN_TTL_MS + 1), null);
  assert.equal(verifyActionToken(token, "x".repeat(40), now), null);
  const [body, sig] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ u: U, t: T, c: "44444444-4444-4444-4444-444444444444", e: now + 1e9 })).toString("base64url");
  assert.equal(verifyActionToken(`${forged}.${sig}`, SECRET, now), null);
  assert.equal(verifyActionToken(`${body}.`, SECRET, now), null);
  assert.equal(verifyActionToken("onzin", SECRET, now), null);
  assert.equal(verifyActionToken(undefined, SECRET, now), null);
});

// --- Meldingstekst en vergrendelscherm ---

test("vergrendelscherm: details alleen als iOS ze verbergt of de gebruiker het wil", () => {
  assert.equal(showDetails(false, "when_unlocked"), true);
  assert.equal(showDetails(false, "always"), false);
  assert.equal(showDetails(false, "never"), false);
  assert.equal(showDetails(true, "always"), true);
});

test("melding: met details bedrag, winkel en potje; zonder details niets daarvan", () => {
  const withDetails = paymentMessage({ merchant: "Albert Heijn", amount: -4.5, categoryName: "Boodschappen", details: true });
  assert.match(withDetails.title, /4,50 bij Albert Heijn/);
  assert.match(withDetails.body, /^Boodschappen\?/);
  const hidden = paymentMessage({ merchant: "Apotheek De Linde", amount: -23.1, categoryName: "Zorg", details: false });
  const text = hidden.title + hidden.body;
  assert.ok(!/Apotheek|Zorg|23/.test(text), text);
});

test("melding: lengtes en geen uitroeptekens", () => {
  const cases = [
    paymentMessage({ merchant: "Een hele lange winkelnaam die nergens op lijkt BV", amount: -1234.56, categoryName: "Een heel lang potje met een naam", details: true }),
    paymentMessage({ merchant: null, amount: -3, categoryName: null, details: true }),
    paymentMessage({ merchant: "X", amount: -3, categoryName: "Y", details: false }),
    manyPaymentsMessage(7),
  ];
  for (const m of cases) {
    assert.ok(m.title.length <= 40, m.title);
    assert.ok(m.body.length <= 90, m.body);
    assert.ok(!m.title.includes("!") && !m.body.includes("!"));
  }
});

test("stille uren: 22:00 tot 07:00 Amsterdam", () => {
  assert.equal(isQuietHour(new Date("2026-11-11T21:30:00Z")), true); // 22:30 winter
  assert.equal(isQuietHour(new Date("2026-11-11T05:30:00Z")), true); // 06:30
  assert.equal(isQuietHour(new Date("2026-11-11T06:30:00Z")), false); // 07:30
  assert.equal(isQuietHour(new Date("2026-07-01T19:30:00Z")), false); // 21:30 zomer
});

// --- Planning: nooit meer dan 4 ophaalrondes per dag (PSD2 zonder gebruiker) ---

test("cron: hoogstens 4 bankophaalrondes per dag", () => {
  const yml = readFileSync(new URL("../.github/workflows/cron.yml", import.meta.url), "utf8");
  assert.equal(syncRunsPerDay(yml), 4);
});

// --- APNs ---

test("apns: ES256-token dat met de publieke sleutel klopt", async () => {
  const { generateKeyPairSync, verify } = await import("node:crypto");
  const { createApnsJwt, apnsPayload } = await import("../lib/push/apns-jwt");
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  // Zoals hij uit een dashboard geplakt wordt: regeleinden als \n.
  const token = createApnsJwt({ keyId: "ABC123DEFG", teamId: "TEAM123456", privateKey: pem.replace(/\n/g, "\\n"), now: 1_700_000_000_000 });
  const [h, p, s] = token.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(h, "base64url").toString()), { alg: "ES256", kid: "ABC123DEFG" });
  assert.deepEqual(JSON.parse(Buffer.from(p, "base64url").toString()), { iss: "TEAM123456", iat: 1_700_000_000 });
  assert.ok(verify("sha256", Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url")));

  const body = JSON.parse(apnsPayload({ title: "T", body: "B", category: "PAYMENT_SUGGEST", data: { tx: "1" } }));
  assert.equal(body.aps.category, "PAYMENT_SUGGEST");
  assert.equal(body.tx, "1");
});
