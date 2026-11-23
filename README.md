# gvkwhwmcp

Genesis Vault (note.com/gensnotes) の記事から、**自動化のノウハウ**と**検証のノウハウ**だけを抜き出して返す MCP サーバ。
画面は無い。AI エージェントが作業中に呼び出して使う。

- 読み取り専用。標準入出力で動き、ネットワークにもファイルの書き込みにも触れない
- API キー不要、費用ゼロ
- 返すのは記事本文ではなく、要約したノウハウのカード。すべてに出典の記事 URL が付く

## 道具

| 名前 | 使いどころ |
|---|---|
| `search_knowhow` | ノウハウを検索する (既定 8 件まで) |
| `get_card` | id を指定して 1 枚を出典つきで返す |
| `checklist_for` | 作業内容から、確かめるべきことをチェックリストにする。完了と言う前に使う |
| `audit_plan` | 計画を渡すと、ありがちな失敗の型を返す。実装を始める前に使う |

当たりが弱いときは何も返さず「該当なし」と答える。無理にそれらしいカードを返さない。

## 入れ方

```bash
git clone https://github.com/gentaron/gvkwhwmcp && cd gvkwhwmcp && npm ci
claude mcp add gvkwhwmcp -- node "$PWD/src/bin.js"
```

## カード

`cards/*.json` に、記事 1 本につき 1 ファイル。1 枚の形:

| 項目 | 中身 |
|---|---|
| `kind` | `automation` (自動化) か `verification` (検証) |
| `claim` | ノウハウの要約。200 字以内 (転載にしないため) |
| `when` | いつ使うか |
| `how_to_verify` | それが効いているかの確かめ方 |
| `fails_when` | 失敗の型 |
| `evidence` | 根拠の強さ。`measured` 実測 / `practiced` 実装・運用 / `principle` 設計判断 (未計測) / `reported` 外部の報告 |
| `source` | 出典の記事 (URL・タイトル・日付) |

`how_to_verify` と `fails_when` と出典の無いカードは検査で落ち、一枚でも落ちるとサーバは起動しない。

## 作業

```bash
npm run validate   # カードの検査と集計
npm test           # 壊したカード・罠の問いで落ちることも含めて確かめる
```

note のエクスポート XML と、そこから作る本文テキストは `raw/` に置く。配布しない (`.gitignore`)。

```bash
python3 -I scripts/extract_articles.py <エクスポート>.xml... > raw/articles.jsonl
python3 -I scripts/rank_candidates.py > data/candidates.json   # カード化する記事の候補順
```

## 進み具合

エクスポートは 3,190 本 (うち公開 3,159 本)。自動化と検証の語を十分に含む公開記事は 101 本で、
今は 2026 年の 4 本から 51 枚のカードを作った段階。残りは `data/candidates.json` の順に進める。
