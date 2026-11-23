// 候補の記事が「カード化済み」「読んだがカード無し」「タイトルで外した」のどれか一つに必ず入っていること
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { readCards } from "../src/cards.js";

const read = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), "utf8"));
const candidates = read("../data/candidates.json");
const triage = read("../data/triage.json");
const carded = new Set(readCards().filter((c) => c.source.type === "note").map((c) => c.source.url));

test("候補はすべて、ちょうど一つの扱いに入っている", () => {
  const triaged = new Set(triage.map((t) => t.url));
  for (const c of candidates) {
    const n = Number(carded.has(c.url)) + Number(triaged.has(c.url));
    assert.equal(n, 1, `${c.title}: 扱いが ${n} 個`);
  }
});

test("台帳の行はすべて候補にあり、扱いと理由が書いてある", () => {
  const urls = new Set(candidates.map((c) => c.url));
  for (const t of triage) {
    assert.ok(urls.has(t.url), t.url);
    assert.ok(["read_no_card", "excluded_by_title"].includes(t.status), t.status);
    assert.ok(t.reason.trim().length > 0);
  }
});
