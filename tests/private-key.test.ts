import assert from "node:assert/strict";
import { createPrivateKey, generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { describePrivateKeyShape, normalizePrivateKey } from "../lib/enablebanking/private-key";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

test("private key: leesbaar in alle vormen waarin hij uit een dashboard komt", () => {
  const variants = {
    origineel: pem,
    "één regel met spaties": pem.replace(/\n/g, " "),
    "letterlijke \\n": pem.replace(/\n/g, "\\n"),
    "met aanhalingstekens": `"${pem.replace(/\n/g, "\\n")}"`,
    "Windows-regeleinden": pem.replace(/\n/g, "\r\n"),
    base64: Buffer.from(pem).toString("base64"),
    "zonder BEGIN-regel": pem.replace("-----BEGIN PRIVATE KEY-----", "").replace(/\n/g, " "),
    "BEGIN met lange streepjes": pem.replace("-----BEGIN PRIVATE KEY-----", "——BEGIN PRIVATE KEY——").replace(/\n/g, " "),
    "kop half weg": pem.replace("-----BEGIN PRIVATE KEY-----", "PRIVATE KEY-----").replace(/\n/g, " "),
    "BEGIN zonder streepjes": pem.replace("-----BEGIN PRIVATE KEY-----", "BEGIN PRIVATE KEY").replace(/\n/g, " "),
  };
  for (const [name, raw] of Object.entries(variants)) {
    assert.doesNotThrow(() => createPrivateKey(normalizePrivateKey(raw)), name);
  }
});

test("private key: de beschrijving toont nooit de inhoud", () => {
  const shape = describePrivateKeyShape(pem.replace(/\n/g, " "));
  assert.match(shape, /begint met BEGIN PRIVATE KEY, met END-regel, 1 regel/);
  const body = pem.split("\n")[1];
  assert.ok(!shape.includes(body.slice(0, 20)));
  assert.equal(describePrivateKeyShape(undefined), "er staat geen key in de variabele");
});
