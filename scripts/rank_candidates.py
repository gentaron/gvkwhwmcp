"""raw/articles.jsonl から、自動化・検証のノウハウを含みそうな記事の順位表を作る。

出力 data/candidates.json は公開済みの記事のタイトルと URL と点数だけ (本文は入れない)。
どの記事をカードにしたかは cards/ の source.url で判断する。
使い方: python -I scripts/rank_candidates.py > data/candidates.json
"""
import json

AUTO = ["自動化", "自動で", "スクリプト", "GitHub Actions", "cron", "ワークフロー", "パイプライン",
        "Claude Code", "エージェント", "MCP", "API", "プロンプト", "リポジトリ", "無料枠", "Cloudflare", "Workers"]
VER = ["検証", "テスト", "リーケージ", "再現", "バックテスト", "ハルシネーション", "出典", "一次情報",
       "確認", "壊", "落ちる", "失敗"]


def main():
    rows = []
    for line in open("raw/articles.jsonl", encoding="utf-8"):
        r = json.loads(line)
        if r["status"] != "publish":
            continue
        t = r["text"]
        a = sum(t.count(w) for w in AUTO)
        v = sum(t.count(w) for w in VER)
        if a >= 5 and v >= 5:
            rows.append({"url": r["url"], "title": r["title"], "date": r["date"],
                         "chars": len(t), "automation_hits": a, "verification_hits": v})
    rows.sort(key=lambda x: -(x["automation_hits"] + x["verification_hits"]))
    print(json.dumps(rows, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
