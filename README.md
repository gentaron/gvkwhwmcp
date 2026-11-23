# gvkwhwmcp

Genesis Vault (note.com/gensnotes) の記事と、gentaron のリポジトリに書かれた規約から、**自動化のノウハウ**と**検証のノウハウ**だけを抜き出して返す MCP サーバ。
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
| `overview` | 総覧。種別と根拠の強さの内訳、出典ごとの枚数、主なタグを返す |

検索系の道具は `min_evidence` (例: `practiced` 以上だけ) と `source_type` (`note` か `repo`) で絞れる。
カードは MCP リソース (`gvkwhwmcp://overview`、`gvkwhwmcp://card/{id}`) としても読める。

当たりが弱いときは何も返さず「該当なし」と答える。無理にそれらしいカードを返さない。

## 入れ方

```bash
git clone https://github.com/gentaron/gvkwhwmcp && cd gvkwhwmcp && npm ci
claude mcp add gvkwhwmcp -- node "$PWD/src/bin.js"
```

## カード

`cards/*.json`。note の記事は 1 本につき 1 ファイル、リポジトリの規約は `repo-rules.json`。1 枚の形:

| 項目 | 中身 |
|---|---|
| `kind` | `automation` (自動化) か `verification` (検証) |
| `claim` | ノウハウの要約。200 字以内 (転載にしないため) |
| `when` | いつ使うか |
| `how_to_verify` | それが効いているかの確かめ方 |
| `fails_when` | 失敗の型 |
| `evidence` | 根拠の強さ。`measured` 実測 / `practiced` 実装・運用 / `principle` 設計判断 (未計測) / `reported` 外部の報告 |
| `source` | 出典。`type: note` は記事の URL・タイトル・日付。`type: repo` はリポジトリ・40 桁のコミット SHA・パス・公開かどうか (URL はそこから組み立てたものと一致しないと落ちる) |

`how_to_verify` と `fails_when` と出典の無いカード、本文に URL・マークアップ・不可視文字のあるカードは検査で落ち、一枚でも落ちるとサーバは起動しない。セキュリティについては [SECURITY.md](SECURITY.md)。

## 作業

```bash
npm run validate   # カードの検査と集計
npm test           # 壊したカード・罠の問い・禁止した API の使用で落ちることも含めて確かめる
npm run test:coverage   # 行 95%・分岐 80%・関数 95% を下回ると落ちる
```

note のエクスポート XML と、そこから作る本文テキストは `raw/` に置く。配布しない (`.gitignore`)。

```bash
python3 -I scripts/extract_articles.py <エクスポート>.xml... > raw/articles.jsonl
python3 -I scripts/rank_candidates.py > data/candidates.json   # カード化する記事の候補順
```

## 進み具合

カードは 88 枚。note の記事 4 本から 51 枚、リポジトリの規約 5 ファイル (QAIZ の CLAUDE.md・RESEARCH_PROTOCOL.md・SECURITY.md、
Mathematical-Physics-Lab- の docs/validation.md、infocollect の ecosystem/README.md) から 37 枚。

note のエクスポートは 3,190 本 (うち公開 3,159 本)。自動化と検証の語を十分に含む公開記事は 101 本で、残り 97 本は
`data/candidates.json` の順に進める。QAIZ は非公開リポジトリなので、そこを出典とするカードのリンクは所有者しか開けない。
