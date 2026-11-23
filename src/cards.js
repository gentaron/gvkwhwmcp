// カードの読み込みと検査。サーバもテストも検査を通ったカードしか使わない。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CARDS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "cards");

export const KINDS = ["automation", "verification"];

// どこまで確かめられた話なのか。カードを使う側が重みを決められるように必ず付ける。
export const EVIDENCE = {
  measured: "筆者が実際に測った",
  practiced: "筆者が実装・運用している",
  principle: "筆者の設計判断 (効果は未計測)",
  reported: "外部の報告や公式文書の紹介 (筆者は未検証)",
};

const REQUIRED_TEXT = ["id", "kind", "title", "claim", "when", "how_to_verify", "fails_when", "evidence"];
const CLAIM_MAX = 200; // ノウハウの要約であって本文の転載ではない
const SOURCE_URL = /^https:\/\/note\.com\/gensnotes\/n\/n[0-9a-f]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// 問題を文字列の配列で返す。空なら合格。
export function validateCard(card) {
  const problems = [];
  if (card === null || typeof card !== "object" || Array.isArray(card)) return ["カードがオブジェクトではない"];
  for (const key of REQUIRED_TEXT) {
    if (typeof card[key] !== "string" || card[key].trim() === "") problems.push(`${key} が空`);
  }
  if (typeof card.id === "string" && !ID.test(card.id)) problems.push(`id の形式が不正: ${card.id}`);
  if (card.kind && !KINDS.includes(card.kind)) problems.push(`kind が不正: ${card.kind}`);
  if (card.evidence && !(card.evidence in EVIDENCE)) problems.push(`evidence が不正: ${card.evidence}`);
  if (typeof card.claim === "string" && card.claim.length > CLAIM_MAX) problems.push(`claim が ${CLAIM_MAX} 字を超える`);
  if (!Array.isArray(card.tags) || card.tags.length === 0 || card.tags.some((t) => typeof t !== "string" || !t)) {
    problems.push("tags が空");
  }
  const s = card.source;
  if (!s || typeof s !== "object") {
    problems.push("source が無い");
  } else {
    if (!SOURCE_URL.test(s.url ?? "")) problems.push(`source.url が note の記事 URL ではない: ${s.url}`);
    if (typeof s.title !== "string" || !s.title) problems.push("source.title が空");
    if (!DATE.test(s.date ?? "")) problems.push(`source.date の形式が不正: ${s.date}`);
  }
  if ("note" in card && typeof card.note !== "string") problems.push("note は文字列");
  return problems;
}

// カード群全体の検査。id の重複もここで見る。
export function validateAll(cards) {
  const problems = [];
  const seen = new Set();
  for (const card of cards) {
    const label = card?.id ?? "(id なし)";
    for (const p of validateCard(card)) problems.push(`${label}: ${p}`);
    if (card?.id) {
      if (seen.has(card.id)) problems.push(`${label}: id が重複`);
      seen.add(card.id);
    }
  }
  return problems;
}

export function readCards(dir = CARDS_DIR) {
  const cards = [];
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
    if (!Array.isArray(data)) throw new Error(`${name}: カードの配列ではない`);
    cards.push(...data);
  }
  return cards;
}

// 検査に落ちたカードが一枚でもあれば起動しない。黙って一部だけ配ることはしない。
export function loadCards(dir = CARDS_DIR) {
  const cards = readCards(dir);
  const problems = validateAll(cards);
  if (problems.length) throw new Error(`カードの検査に失敗:\n${problems.join("\n")}`);
  return cards;
}
