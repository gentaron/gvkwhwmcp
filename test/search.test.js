import assert from "node:assert/strict";
import { test } from "node:test";
import { readCards } from "../src/cards.js";
import { search } from "../src/search.js";

const cards = readCards();
const ids = (q, opts) => search(cards, q, opts).map((h) => h.card.id);

test("関係するカードが上位に来る", () => {
  assert.ok(ids("キャッシュの無効化").slice(0, 3).includes("cache-needs-invalidation"));
  assert.ok(ids("フックで強制").slice(0, 3).includes("enforce-with-hooks-not-requests"));
  assert.ok(ids("日本語の全文検索").slice(0, 3).includes("japanese-fts-trigram-and-mixed-score"));
});

test("関係ないことを聞かれたら何も返さない (罠の問い)", () => {
  assert.deepEqual(ids("好きな食べ物"), []);
  assert.deepEqual(ids("今日の天気"), []);
  assert.deepEqual(ids("料理のレシピ"), []);
  assert.deepEqual(ids("ぬぬぬぬぬ"), []);
  assert.deepEqual(ids(""), []);
});

test("種別で絞れる", () => {
  for (const h of search(cards, "テスト", { kind: "automation" })) assert.equal(h.card.kind, "automation");
});

test("件数の上限は既定 8", () => {
  assert.ok(search(cards, "AI エージェント テスト 検証 記録").length <= 8);
});
