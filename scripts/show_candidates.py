"""未カード化の候補を番号で表示する (作業用)。番号は show_candidates.py --list の順。"""
import glob, json, sys
done = {c["source"]["url"] for f in glob.glob("cards/*.json") for c in json.load(open(f)) if c["source"]["type"] == "note"}
rows = [r for r in json.load(open("data/candidates.json"))]
text = {json.loads(l)["url"]: json.loads(l)["text"] for l in open("raw/articles.jsonl")}
for u in sys.argv[1:]:
    r = next(x for x in rows if x["url"].endswith(u))
    print("=====", r["date"], r["url"], r["title"]); print(text[r["url"]])
