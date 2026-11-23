// 自分専用の評価セットで検索の質を測る。罠の問いには何も返さないこと
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { loadCards } from "../src/cards.js";
import { search } from "../src/search.js";

const cards = loadCards();
const { cases, trap } = JSON.parse(fs.readFileSync(new URL("./eval.json", import.meta.url), "utf8"));
const ids = new Set(cards.map((c) => c.id));

test("評価セットの期待する id は実在する", () => {
  for (const c of cases) assert.ok(ids.has(c.expect), c.expect);
});

for (const c of cases) {
  test(`上位 3 件に入る: ${c.q}`, () => {
    const top = search(cards, c.q, { limit: 3 }).map((h) => h.card.id);
    assert.ok(top.includes(c.expect), `${c.expect} が無い: ${top.join(", ")}`);
  });
}

for (const q of trap) {
  test(`罠の問いには何も返さない: ${q}`, () => assert.deepEqual(search(cards, q), []));
}
