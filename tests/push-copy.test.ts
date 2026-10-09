import assert from "node:assert/strict";
import { test } from "node:test";
import { openCardsMessage, weekMessage } from "../lib/push/copy";

test("kaartjesmelding: kort, zonder uitroeptekens of schuldgevoel, en wisselt per dag", () => {
  const seen = new Set<string>();
  for (const count of [1, 3, 12, 16, 120]) {
    for (let day = 0; day < 10; day++) {
      const { title, body } = openCardsMessage(count, day);
      seen.add(title + body);
      assert.ok(title.length <= 40, `titel te lang: ${title}`);
      assert.ok(body.length <= 90, `tekst te lang: ${body}`);
      assert.ok(!/[!€]/.test(title + body), `verboden teken: ${title} ${body}`);
      assert.ok(!/vergeten|kwijt|verloren|streak/i.test(title + body), `schuldgevoel: ${body}`);
    }
  }
  assert.ok(seen.size >= 10);
  assert.match(openCardsMessage(40, 0).body, /morgen/);
});

test("weekmelding: kort, zonder bedragen, uitroeptekens of schuldgevoel", () => {
  const seen = new Set<string>();
  for (let day = 0; day < 6; day++) {
    const { title, body } = weekMessage(day);
    seen.add(title);
    assert.ok(title.length <= 40, `titel te lang: ${title}`);
    assert.ok(body.length <= 90, `tekst te lang: ${body}`);
    assert.ok(!/[!€\d]/.test(title + body), `verboden teken: ${title} ${body}`);
    assert.ok(!/vergeten|kwijt|verloren|streak/i.test(title + body), `schuldgevoel: ${body}`);
  }
  assert.ok(seen.size >= 2);
});
