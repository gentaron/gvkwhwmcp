"""data/candidates.json のうちカードになっていない記事を、扱いと理由つきで data/triage.json に書く。

カード化済みかどうかは cards/ の source.url で決まる。ここに書くのはそれ以外の扱いだけ。
- read_no_card: 読んだがカードにしなかった
- excluded_by_scan: 本文の「筆者が手を動かした印」が少ないので精読しなかった
test/triage.test.js が、候補がどれか一つに必ず入っていることを確かめる。
使い方: python -I scripts/build_triage.py > data/triage.json  (raw/articles.jsonl が要る)
"""
import glob, json

READ_NO_CARD = {
    "https://note.com/gensnotes/n/nd9750a66f949": "巻き戻しの要点は agent-rollback のカード (savepoint-each-agent-step) に含まれるため",
    "https://note.com/gensnotes/n/n50a61207560c": "同じ内容の先行記事 (n0d684c220394) をカードの出典にしたため",
    "https://note.com/gensnotes/n/n5b907233306a": "要点は既存のカード (separate-vision-from-done、free-tier-check-both-sides など) と重なるため",
}
# 筆者自身が手を動かした印。1,000 字あたりの出現数がこれ未満の記事は精読しなかった
MARKERS = ["試した", "試してみ", "実測", "測った", "測ってみ", "動かした", "動かして", "確かめた", "確認した", "未検証",
           "検証して", "ビルド", "cloneして", "インストールして", "入れてみ", "落ちた", "詰ま", "失敗した", "私なら", "うちの"]
THRESHOLD = 1.0

text = {}
for line in open("raw/articles.jsonl", encoding="utf-8"):
    r = json.loads(line)
    text[r["url"]] = r["text"]
carded = {c["source"]["url"] for f in glob.glob("cards/*.json") for c in json.load(open(f, encoding="utf-8"))
          if c["source"]["type"] == "note"}
rows = []
for r in json.load(open("data/candidates.json", encoding="utf-8")):
    if r["url"] in carded:
        continue
    if r["url"] in READ_NO_CARD:
        rows.append({"url": r["url"], "title": r["title"], "status": "read_no_card", "reason": READ_NO_CARD[r["url"]]})
        continue
    t = text[r["url"]]
    density = round(sum(t.count(m) for m in MARKERS) * 1000 / max(len(t), 1), 2)
    if density >= THRESHOLD:
        raise SystemExit(f"未処理: 印の密度 {density} の記事は読む対象: {r['title']}")
    rows.append({"url": r["url"], "title": r["title"], "status": "excluded_by_scan", "marker_density": density,
                 "reason": f"筆者が手を動かした印 (試した・測った・確かめた など) が 1,000 字あたり {density} で、基準 {THRESHOLD} 未満。精読していない"})
print(json.dumps(rows, ensure_ascii=False, indent=1))
