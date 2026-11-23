// 依存なしの検索。日本語は単語で区切れないので、文字の 2-gram で照合する。
// 当たりが弱いときは何も返さない。それらしいカードを無理に返すより「無い」と言うほうが安全。

const WEIGHTS = {
  default: { title: 3, tags: 3, claim: 2, when: 1, how_to_verify: 1, fails_when: 1 },
  checklist: { title: 2, tags: 3, claim: 1, when: 2, how_to_verify: 3, fails_when: 1 },
  audit: { title: 2, tags: 3, claim: 1, when: 1, how_to_verify: 1, fails_when: 3 },
};

export const MIN_SCORE = 0.3;

function normalize(text) {
  return text.toLowerCase().normalize("NFKC").replace(/[\s、。，．・「」『』（）()【】\[\]:：/／]+/g, " ");
}

export function grams(text) {
  const out = new Set();
  for (const word of normalize(text).split(" ").filter(Boolean)) {
    if (word.length === 1) out.add(word);
    for (let i = 0; i < word.length - 1; i++) out.add(word.slice(i, i + 2));
  }
  return out;
}

function fieldText(card, field) {
  return field === "tags" ? card.tags.join(" ") : card[field] ?? "";
}

// 0〜1。クエリの 2-gram がカードのどこかに現れた割合 (網羅) を主に、
// どのフィールドに現れたか (モードごとの重み) を従にして混ぜる。
export function score(card, query, mode = "default") {
  const q = grams(query);
  if (q.size === 0) return 0;
  const weights = WEIGHTS[mode] ?? WEIGHTS.default;
  const anywhere = new Set();
  let weighted = 0;
  let sum = 0;
  for (const [field, w] of Object.entries(weights)) {
    const f = grams(fieldText(card, field));
    let hit = 0;
    for (const g of q) {
      if (f.has(g)) {
        hit++;
        anywhere.add(g);
      }
    }
    weighted += w * (hit / q.size);
    sum += w;
  }
  return 0.7 * (anywhere.size / q.size) + 0.3 * (weighted / sum);
}

export function search(cards, query, { kind, limit = 8, mode = "default", minScore = MIN_SCORE } = {}) {
  return cards
    .filter((c) => !kind || c.kind === kind)
    .map((card) => ({ card, score: score(card, query, mode) }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id))
    .slice(0, limit);
}
