"""data/candidates.json のうちカードになっていない記事を、扱いと理由つきで data/triage.json に書く。

カード化済みかどうかは cards/ の source.url で決まる。ここには「読んだがカードにしなかった」と
「タイトルで外した (本文は読んでいない)」だけを書く。test/triage.test.js が、候補がどれか一つに
必ず入っていることを確かめる。
使い方: python -I scripts/build_triage.py > data/triage.json
"""
import glob, json

READ_NO_CARD = {
    "https://note.com/gensnotes/n/nd9750a66f949": "巻き戻しの要点は agent-rollback のカード (savepoint-each-agent-step) に含まれるため",
}
REASON_BY_TITLE = "タイトルから、他人のツールの紹介・ニュースのまとめ・エッセイが中心と判断して外した。本文は読んでいない"

carded = {c["source"]["url"] for f in glob.glob("cards/*.json") for c in json.load(open(f, encoding="utf-8"))
          if c["source"]["type"] == "note"}
rows = []
for r in json.load(open("data/candidates.json", encoding="utf-8")):
    if r["url"] in carded:
        continue
    if r["url"] in READ_NO_CARD:
        rows.append({"url": r["url"], "title": r["title"], "status": "read_no_card", "reason": READ_NO_CARD[r["url"]]})
    else:
        rows.append({"url": r["url"], "title": r["title"], "status": "excluded_by_title", "reason": REASON_BY_TITLE})
print(json.dumps(rows, ensure_ascii=False, indent=1))
