"""raw/articles.jsonl からタイトルの一部で記事を表示する (作業用)。"""
import json, sys
for l in open("raw/articles.jsonl"):
    r = json.loads(l)
    if any(k in r["title"] for k in sys.argv[1:]):
        print("=====", r["date"], r["url"], r["title"]); print(r["text"])
