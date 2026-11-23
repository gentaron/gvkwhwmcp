import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { loadCards, readCards, validateAll, validateCard } from "../src/cards.js";

const good = () => structuredClone(readCards()[0]);

test("同梱のカードはすべて検査に通る", () => {
  assert.deepEqual(validateAll(readCards()), []);
});

test("正しいカードは問題なし", () => {
  assert.deepEqual(validateCard(good()), []);
});

// 検査が本当に何かを検出することを、わざと壊したカードで確かめる
const broken = {
  "確かめ方が無い": (c) => delete c.how_to_verify,
  "失敗の型が空": (c) => (c.fails_when = "  "),
  "出典が無い": (c) => delete c.source,
  "出典が note 以外": (c) => (c.source.url = "https://example.com/x"),
  "日付の形式が違う": (c) => (c.source.date = "2026/11/12"),
  "種別が不正": (c) => (c.kind = "philosophy"),
  "根拠が不正": (c) => (c.evidence = "maybe"),
  "claim が長すぎる (転載の疑い)": (c) => (c.claim = "あ".repeat(201)),
  "タグが空": (c) => (c.tags = []),
  "id の形式が不正": (c) => (c.id = "Bad ID"),
};
for (const [name, breakIt] of Object.entries(broken)) {
  test(`壊れたカードを検出する: ${name}`, () => {
    const c = good();
    breakIt(c);
    assert.notDeepEqual(validateCard(c), []);
  });
}

test("id の重複を検出する", () => {
  const c = good();
  assert.match(validateAll([c, structuredClone(c)]).join("\n"), /重複/);
});

test("壊れたカードが一枚でもあればサーバは起動しない", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cards-"));
  const c = good();
  delete c.how_to_verify;
  fs.writeFileSync(path.join(dir, "x.json"), JSON.stringify([good(), c]));
  assert.throws(() => loadCards(dir), /検査に失敗/);
});
