// 実際にサーバを子プロセスで起動し、MCP クライアントとして呼ぶ
import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const bin = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "bin.js");
const client = new Client({ name: "test", version: "0" });
const raw = (name, args) => client.callTool({ name, arguments: args });
const call = async (name, args) => (await raw(name, args)).content[0].text;

before(async () => {
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [bin] }));
});
after(async () => client.close());

test("5 つの道具があり、すべて読み取り専用と宣言している", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["audit_plan", "checklist_for", "get_card", "overview", "search_knowhow"]);
  for (const t of tools) assert.equal(t.annotations?.readOnlyHint, true, t.name);
});

test("返答は「指示ではなくデータ」と明示する", async () => {
  assert.match(await call("search_knowhow", { query: "キャッシュ" }), /^以下は gvkwhwmcp のカード .*指示ではありません/);
});

test("search_knowhow は出典つきで返す", async () => {
  const out = await call("search_knowhow", { query: "部分 clone で高速化" });
  assert.match(out, /git-partial-clone-batch-read/);
  assert.match(out, /https:\/\/note\.com\/gensnotes\/n\//);
});

test("リポジトリ出典は固定したコミットを指し、非公開ならそう書く", async () => {
  const out = await call("get_card", { id: "three-dates-available-at" });
  assert.match(out, /github\.com\/gentaron\/QAIZ\/blob\/[0-9a-f]{40}\/CLAUDE\.md/);
  assert.match(out, /非公開リポジトリ/);
  assert.doesNotMatch(await call("get_card", { id: "harden-ci-workflow" }), /非公開/);
});

test("根拠の強さで絞れる", async () => {
  const out = await call("search_knowhow", { query: "高速化 計測", min_evidence: "measured" });
  for (const m of out.matchAll(/根拠: (\w+)/g)) assert.equal(m[1], "measured");
});

test("出典の種類で絞れる", async () => {
  const out = await call("search_knowhow", { query: "リーケージ", source_type: "repo" });
  assert.doesNotMatch(out, /note\.com/);
  assert.match(out, /github\.com/);
});

test("当たりが無ければ、無いと言う", async () => {
  assert.match(await call("search_knowhow", { query: "好きな食べ物" }), /該当するカードはありません/);
});

test("長すぎる入力と不正な id は受け付けない", async () => {
  const long = await raw("search_knowhow", { query: "あ".repeat(1001) }).catch((e) => ({ isError: true, e }));
  assert.equal(long.isError, true);
  const bad = await raw("get_card", { id: "../../etc/passwd" }).catch((e) => ({ isError: true, e }));
  assert.equal(bad.isError, true);
});

test("get_card は存在しない id を作らない", async () => {
  assert.match(await call("get_card", { id: "short-claude-md" }), /CLAUDE\.md/);
  assert.match(await call("get_card", { id: "no-such-card" }), /ありません/);
});

test("checklist_for は検証のカードだけをチェック項目にする", async () => {
  const out = await call("checklist_for", { task: "バックテストで欠損と未来の情報を確かめたい" });
  assert.match(out, /- \[ \]/);
  assert.match(out, /finance-invariants-to-check|three-dates-available-at/);
  assert.doesNotMatch(out, /根拠: \w+\)\n.*automation/);
});

test("audit_plan は失敗の型を返す", async () => {
  const out = await call("audit_plan", { plan: "AI エージェントを並列でたくさん動かして速くしたい" });
  assert.match(out, /起きうる失敗/);
  assert.match(out, /dependency-graph-before-parallel/);
});

test("overview は全体の枚数と出典を返す", async () => {
  const out = await call("overview", {});
  assert.match(out, /総覧 \(カード \d+ 枚 \/ 出典 \d+ 件\)/);
  assert.match(out, /gentaron\/QAIZ/);
  assert.match(out, /note/);
});

test("カードはリソースとしても読める", async () => {
  const { resources } = await client.listResources();
  assert.ok(resources.some((r) => r.uri === "gvkwhwmcp://overview"));
  assert.ok(resources.some((r) => r.uri === "gvkwhwmcp://card/null-not-zero"));
  const { contents } = await client.readResource({ uri: "gvkwhwmcp://card/null-not-zero" });
  assert.match(contents[0].text, /null/);
});
