// カードの読み込みと検査。サーバもテストも検査を通ったカードしか使わない。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CARDS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "cards");

export const KINDS = ["automation", "verification"];

// どこまで確かめられた話なのか。強い順に並べる (rank が大きいほど強い)。
export const EVIDENCE = {
  measured: { rank: 4, label: "筆者が実際に測った" },
  practiced: { rank: 3, label: "筆者が実装・運用している" },
  principle: { rank: 2, label: "筆者の設計判断 (効果は未計測)" },
  reported: { rank: 1, label: "外部の報告や公式文書の紹介 (筆者は未検証)" },
};

export const SOURCE_TYPES = ["note", "repo"];

const TEXT_FIELDS = ["id", "kind", "title", "claim", "when", "how_to_verify", "fails_when", "evidence"];
const PROSE_FIELDS = ["title", "claim", "when", "how_to_verify", "fails_when", "note"];
const CLAIM_MAX = 200; // ノウハウの要約であって本文の転載ではない
const FIELD_MAX = 400;
const NOTE_URL = /^https:\/\/note\.com\/gensnotes\/n\/n[0-9a-f]+$/;
const REPO = /^gentaron\/[A-Za-z0-9._-]+$/;
const COMMIT = /^[0-9a-f]{40}$/;
const REPO_PATH = /^(?!\/)(?!.*\.\.)[A-Za-z0-9._\/-]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// 制御文字と、表示と中身をずらせる不可視文字 (ゼロ幅・双方向制御)。
const UNSAFE_CHARS = /[\u0000-\u0008\u000b-\u001f\u007f​-‏‪-‮⁠-⁤⁦-⁩﻿]/;
// 本文に URL やマークアップを持たせない。リンクは出典だけ。
const LINK_OR_MARKUP = /https?:\/\/|www\.|<\s*\/?\s*[a-z!]/i;

export function repoUrl({ repo, commit, path: p }) {
  return `https://github.com/${repo}/blob/${commit}/${p}`;
}

function validateSource(s, problems) {
  if (!s || typeof s !== "object" || Array.isArray(s)) return problems.push("source が無い");
  if (!SOURCE_TYPES.includes(s.type)) return problems.push(`source.type が不正: ${s.type}`);
  if (typeof s.title !== "string" || !s.title.trim()) problems.push("source.title が空");
  if (!DATE.test(s.date ?? "") || Number.isNaN(Date.parse(s.date))) problems.push(`source.date が不正: ${s.date}`);
  if (s.type === "note") {
    if (!NOTE_URL.test(s.url ?? "")) problems.push(`source.url が note の記事 URL ではない: ${s.url}`);
    for (const k of ["repo", "commit", "path", "public"]) if (k in s) problems.push(`note の出典に ${k} は不要`);
  } else {
    if (!REPO.test(s.repo ?? "")) problems.push(`source.repo が不正: ${s.repo}`);
    if (!COMMIT.test(s.commit ?? "")) problems.push("source.commit は 40 桁のコミット SHA で固定する");
    if (!REPO_PATH.test(s.path ?? "")) problems.push(`source.path が不正: ${s.path}`);
    if (s.url !== repoUrl(s)) problems.push("source.url が repo・commit・path と食い違う");
    if (typeof s.public !== "boolean") problems.push("source.public (公開リポジトリか) を true か false で書く");
  }
}

// 問題を文字列の配列で返す。空なら合格。
export function validateCard(card) {
  const problems = [];
  if (card === null || typeof card !== "object" || Array.isArray(card)) return ["カードがオブジェクトではない"];
  for (const key of TEXT_FIELDS) {
    if (typeof card[key] !== "string" || card[key].trim() === "") problems.push(`${key} が空`);
  }
  if ("note" in card && (typeof card.note !== "string" || !card.note.trim())) problems.push("note は空でない文字列");
  if (typeof card.id === "string" && !ID.test(card.id)) problems.push(`id の形式が不正: ${card.id}`);
  if (card.kind && !KINDS.includes(card.kind)) problems.push(`kind が不正: ${card.kind}`);
  if (card.evidence && !(card.evidence in EVIDENCE)) problems.push(`evidence が不正: ${card.evidence}`);
  if (typeof card.claim === "string" && card.claim.length > CLAIM_MAX) problems.push(`claim が ${CLAIM_MAX} 字を超える`);
  for (const key of PROSE_FIELDS) {
    const v = card[key];
    if (typeof v !== "string") continue;
    if (v.length > FIELD_MAX) problems.push(`${key} が ${FIELD_MAX} 字を超える`);
    if (UNSAFE_CHARS.test(v)) problems.push(`${key} に制御文字か不可視文字がある`);
    if (LINK_OR_MARKUP.test(v)) problems.push(`${key} に URL かマークアップがある (リンクは出典だけ)`);
  }
  if (!Array.isArray(card.tags) || card.tags.length === 0 || card.tags.some((t) => typeof t !== "string" || !t.trim())) {
    problems.push("tags が空");
  } else if (new Set(card.tags).size !== card.tags.length) {
    problems.push("tags が重複");
  }
  validateSource(card.source, problems);
  const allowed = new Set([...TEXT_FIELDS, "note", "tags", "source"]);
  for (const key of Object.keys(card)) if (!allowed.has(key)) problems.push(`知らない項目: ${key}`);
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

function deepFreeze(value) {
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

// 検査に落ちたカードが一枚でもあれば起動しない。黙って一部だけ配ることはしない。
// 読み込んだカードは凍結し、実行中に書き換えられないようにする。
export function loadCards(dir = CARDS_DIR) {
  const cards = readCards(dir);
  const problems = validateAll(cards);
  if (problems.length) throw new Error(`カードの検査に失敗:\n${problems.join("\n")}`);
  return deepFreeze(cards);
}

