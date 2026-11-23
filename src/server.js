// 読み取り専用の MCP サーバ。標準入出力で動き、ネットワークにもファイルの書き込みにも触れない。
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { EVIDENCE, KINDS, loadCards } from "./cards.js";
import { search } from "./search.js";

const NOTHING =
  "該当するカードはありません。このサーバに無いノウハウを推測で補わないでください。";

function formatCard(card, { full = false } = {}) {
  const lines = [
    `## ${card.title}`,
    `id: ${card.id} / 種別: ${card.kind} / 根拠: ${card.evidence} (${EVIDENCE[card.evidence]})`,
    "",
    card.claim,
    "",
    `- いつ使う: ${card.when}`,
    `- 確かめ方: ${card.how_to_verify}`,
    `- 失敗の型: ${card.fails_when}`,
  ];
  if (card.note) lines.push(`- 補足: ${card.note}`);
  if (full) lines.push(`- タグ: ${card.tags.join(", ")}`);
  lines.push(`- 出典: ${card.source.title} (${card.source.date}) ${card.source.url}`);
  return lines.join("\n");
}

function text(body) {
  return { content: [{ type: "text", text: body }] };
}

export function createServer(cards = loadCards()) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const server = new McpServer({ name: "gvkwhwmcp", version: "0.1.0" });

  server.registerTool(
    "search_knowhow",
    {
      title: "ノウハウを検索",
      description:
        "Genesis Vault の記事から抜き出した、自動化と検証のノウハウを検索する。各カードには根拠の強さ (実測・運用・設計判断・外部報告) と出典が付く。",
      inputSchema: {
        query: z.string().min(1).describe("探したいこと。日本語でよい"),
        kind: z.enum(KINDS).optional().describe("automation (自動化) か verification (検証) に絞る"),
        limit: z.number().int().min(1).max(20).optional().describe("最大件数。既定は 8"),
      },
    },
    async ({ query, kind, limit }) => {
      const hits = search(cards, query, { kind, limit });
      if (!hits.length) return text(NOTHING);
      return text(hits.map((h) => formatCard(h.card)).join("\n\n"));
    },
  );

  server.registerTool(
    "get_card",
    {
      title: "カードを取得",
      description: "id を指定してカードを 1 枚、出典つきで返す。",
      inputSchema: { id: z.string().min(1) },
    },
    async ({ id }) => {
      const card = byId.get(id);
      return card ? text(formatCard(card, { full: true })) : text(`id "${id}" のカードはありません。`);
    },
  );

  server.registerTool(
    "checklist_for",
    {
      title: "検証チェックリスト",
      description:
        "これからやる作業を渡すと、関係する検証のノウハウを「確かめ方」中心のチェックリストにして返す。完了と言う前に使う。",
      inputSchema: {
        task: z.string().min(1).describe("これからやる作業、またはやった作業"),
        limit: z.number().int().min(1).max(20).optional(),
      },
    },
    async ({ task, limit }) => {
      const hits = search(cards, task, { kind: "verification", mode: "checklist", limit });
      if (!hits.length) return text(NOTHING);
      const items = hits.map(
        ({ card }) => `- [ ] ${card.how_to_verify}\n  (${card.title} / id: ${card.id} / ${card.source.url})`,
      );
      return text(`# 確かめること\n\n${items.join("\n")}`);
    },
  );

  server.registerTool(
    "audit_plan",
    {
      title: "計画の失敗パターン点検",
      description:
        "計画や設計を渡すと、関係するノウハウの「失敗の型」を返す。実装を始める前に、ありがちな落とし穴を点検するために使う。",
      inputSchema: {
        plan: z.string().min(1).describe("計画・設計・やろうとしていること"),
        limit: z.number().int().min(1).max(20).optional(),
      },
    },
    async ({ plan, limit }) => {
      const hits = search(cards, plan, { mode: "audit", limit });
      if (!hits.length) return text(NOTHING);
      const items = hits.map(
        ({ card }) =>
          `- ${card.fails_when}\n  対策: ${card.claim}\n  (id: ${card.id} / 根拠: ${card.evidence} / ${card.source.url})`,
      );
      return text(`# この計画で起きうる失敗\n\n${items.join("\n")}`);
    },
  );

  return server;
}

