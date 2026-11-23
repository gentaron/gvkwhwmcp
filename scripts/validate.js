// カードを検査して結果を表示する。問題が一つでもあれば終了コード 1。
import { readCards, validateAll } from "../src/cards.js";

const cards = readCards();
const problems = validateAll(cards);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
const count = (key) =>
  Object.entries(cards.reduce((acc, c) => ({ ...acc, [c[key]]: (acc[c[key]] ?? 0) + 1 }), {}))
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
console.log(`カード ${cards.length} 枚、すべて合格`);
console.log(`種別: ${count("kind")}`);
console.log(`根拠: ${count("evidence")}`);
console.log(`出典: ${new Set(cards.map((c) => c.source.url)).size} 件`);
