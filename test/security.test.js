// 配布するコードと配布物の中身について、守るべきことをテストで強制する
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcFiles = fs.readdirSync(path.join(root, "src")).map((f) => path.join(root, "src", f));

const ALLOWED_IMPORTS = [/^node:(fs|path|url)$/, /^@modelcontextprotocol\/sdk\//, /^zod$/, /^\.\//];
const FORBIDDEN = [
  /\b(writeFile|appendFile|mkdir|rmSync|rm\(|unlink|rename|createWriteStream|chmod)/,
  /\bchild_process\b|\bworker_threads\b|\bnode:(net|http|https|dgram|tls|dns|vm)\b/,
  /\bfetch\(|\beval\(|new Function\(|process\.env\b/,
];

test("配布するコードは許可したモジュールしか読み込まない", () => {
  for (const f of srcFiles) {
    const body = fs.readFileSync(f, "utf8");
    for (const [, spec] of body.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
      assert.ok(ALLOWED_IMPORTS.some((re) => re.test(spec)), `${path.basename(f)} が ${spec} を読み込んでいる`);
    }
  }
});

test("配布するコードは書き込み・外部通信・コード実行をしない", () => {
  for (const f of srcFiles) {
    const body = fs.readFileSync(f, "utf8");
    for (const re of FORBIDDEN) assert.doesNotMatch(body, re, `${path.basename(f)}: ${re}`);
  }
});

test("この検査自体が違反を検出できる", () => {
  assert.ok(FORBIDDEN.some((re) => re.test('import http from "node:http"; fetch("x")')));
  assert.ok(!ALLOWED_IMPORTS.some((re) => re.test("node:child_process")));
});

test("配布物に raw/ やエクスポートが入らない", () => {
  const [pack] = JSON.parse(execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: root, encoding: "utf8" }));
  const files = pack.files.map((f) => f.path);
  for (const f of files) {
    assert.ok(/^(src\/|cards\/|package\.json$|README\.md$|LICENSE$|LICENSE-CARDS\.md$)/.test(f), `配布物に想定外のファイル: ${f}`);
  }
  assert.ok(files.includes("src/bin.js"));
  assert.ok(files.some((f) => f.startsWith("cards/")));
});

test("依存は版を固定している", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  for (const [name, v] of Object.entries(pkg.dependencies)) assert.match(v, /^\d+\.\d+\.\d+$/, `${name}@${v}`);
});
