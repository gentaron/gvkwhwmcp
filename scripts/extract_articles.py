"""note.com のエクスポート XML (WXR) を記事ごとのプレーンテキストに直す。

出力は raw/articles.jsonl (配布しない)。標準ライブラリだけで動く。
使い方: python -I scripts/extract_articles.py <xml>... > raw/articles.jsonl
"""
import html
import json
import re
import sys
import xml.etree.ElementTree as ET

NS = {
    "content": "http://purl.org/rss/1.0/modules/content/",
    "wp": "http://wordpress.org/export/1.2/",
}


def to_text(body: str) -> str:
    body = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", "", body)
    body = re.sub(r"(?i)<br\s*/?>|</(p|h[1-6]|li|div|blockquote|pre|figure)>", "\n", body)
    body = re.sub(r"(?s)<[^>]+>", "", body)
    body = html.unescape(body)
    return re.sub(r"\n{3,}", "\n\n", body).strip()


def main(paths):
    for path in paths:
        for item in ET.parse(path).getroot().iter("item"):
            body = item.findtext("content:encoded", default="", namespaces=NS)
            rec = {
                "title": html.unescape(item.findtext("title", default="")),
                "url": item.findtext("link", default=""),
                "date": item.findtext("wp:post_date", default="", namespaces=NS)[:10],
                "status": item.findtext("wp:status", default="", namespaces=NS),
                "text": to_text(body),
            }
            print(json.dumps(rec, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1:])
