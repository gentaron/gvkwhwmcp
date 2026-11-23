// 実際にサーバを子プロセスで起動し、MCP クライアントとして呼ぶ
import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const bin = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "bin.js");
const client = new Client({ name: "test", version: "0" });
const call = async (name, args) => (await client.callTool({ name, arguments: args })).content[0].text;

before(async () => {
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [bin] }));
});
after(async () => client.close());

test("4 つの道具がある", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["audit_plan", "checklist_for", "get_card", "search_knowhow"]);
});

test("search_knowhow は出典つきで返す", async () => {
  const out = await call("search_knowhow", { query: "部分 clone で高速化" });
  assert.match(out, /git-partial-clone-batch-read/);
  assert.match(out, /https:\/\/note\.com\/gensnotes\/n\//);
});

test("当たりが無ければ、無いと言う", async () => {
  assert.match(await call("search_knowhow", { query: "好きな食べ物" }), /該当するカードはありません/);
});

test("get_card は存在しない id を作らない", async () => {
  assert.match(await call("get_card", { id: "short-claude-md" }), /CLAUDE\.md/);
  assert.match(await call("get_card", { id: "no-such-card" }), /ありません/);
});

test("checklist_for は検証のカードだけをチェック項目にする", async () => {
  const out = await call("checklist_for", { task: "バックテストで欠損と未来の情報を確かめたい" });
  assert.match(out, /- \[ \]/);
  assert.match(out, /finance-invariants-to-check/);
});

test("audit_plan は失敗の型を返す", async () => {
  const out = await call("audit_plan", { plan: "AI エージェントを並列でたくさん動かして速くしたい" });
  assert.match(out, /起きうる失敗/);
  assert.match(out, /dependency-graph-before-parallel/);
});
