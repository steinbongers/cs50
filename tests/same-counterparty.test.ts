import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_SAME_COUNTERPARTY, sameCounterparty } from "../lib/transactions/same-counterparty";

const tx = (id: string, counterparty: string, amount: number) => ({ id, counterparty, amount });

test("ook de andere: zelfde tegenpartij en richting, nooit het kaartje zelf", () => {
  const picked = tx("a", "Albert Heijn", -12.5);
  const queue = [
    picked,
    tx("b", "albert  heijn ", -3.1),
    tx("c", "Albert Heijn", 20),
    tx("d", "Jumbo", -8),
    tx("e", "Albert Heijn", -40),
  ];
  assert.deepEqual(
    sameCounterparty(picked, queue).map((t) => t.id),
    ["b", "e"],
  );
  assert.deepEqual(sameCounterparty(tx("x", "  ", -1), [tx("y", "", -1)]), []);
});

test("ook de andere: hoogstens een vast aantal per tik", () => {
  const many = Array.from({ length: 30 }, (_, i) => tx(String(i), "Gemeente", -10));
  assert.equal(sameCounterparty(tx("p", "Gemeente", -1), many).length, MAX_SAME_COUNTERPARTY);
});
