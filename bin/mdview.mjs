#!/usr/bin/env node
/**
 * mdview - 指定した Markdown ファイルを既定ブラウザで表示する簡易ビューア。
 * ローカル HTTP サーバを立ててフォルダごと公開するため、.md 同士の相対リンクや
 * 画像を辿って回遊できる。一定時間アクセスが無ければ自動終了する。
 * 使い方: mdview <file.md>
 */
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";
import { spawn } from "node:child_process";
import { createMdServer } from "../src/server.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** アイドル自動終了までの分数（0 で無効）。env MDVIEW_IDLE_MIN で上書き可。 */
const IDLE_MIN = Number.parseInt(process.env.MDVIEW_IDLE_MIN ?? "30", 10) || 0;

async function main() {
  const arg = process.argv[2];
  if (!arg || arg === "-h" || arg === "--help") {
    console.log("使い方: mdview <file.md>");
    console.log("  指定した Markdown ファイルを既定ブラウザで表示します（mermaid・相対リンク対応）。");
    console.log("  フォルダをローカルサーバで公開するため、.md 同士のリンクを辿れます。");
    process.exit(arg ? 0 : 1);
  }

  const mdPath = resolve(process.cwd(), arg);
  try {
    if (!(await stat(mdPath)).isFile()) throw new Error("ファイルではありません");
  } catch (e) {
    console.error(`[mdview] ファイルを開けません: ${mdPath}`);
    console.error(`         ${e.message}`);
    process.exit(1);
  }

  const rootDir = dirname(mdPath);
  const initialFile = basename(mdPath);
  const template = await readFile(join(__dirname, "..", "index.html"), "utf8");

  let lastActivity = Date.now();
  const server = createMdServer({
    rootDir,
    template,
    initialFile,
    onActivity: () => {
      lastActivity = Date.now();
    },
  });

  server.on("error", (e) => {
    console.error(`[mdview] サーバ起動に失敗: ${e.message}`);
    process.exit(1);
  });

  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/${encodeURIComponent(initialFile)}`;
    openInBrowser(url);
    console.log(`[mdview] 表示中: ${initialFile}`);
    console.log(`[mdview] ${url}`);
    const idleNote = IDLE_MIN > 0 ? ` / ${IDLE_MIN}分アイドルで自動終了` : "";
    console.log(`[mdview] Ctrl-C で終了${idleNote}`);
  });

  if (IDLE_MIN > 0) {
    const idleMs = IDLE_MIN * 60_000;
    const timer = setInterval(() => {
      if (Date.now() - lastActivity > idleMs) {
        console.log("[mdview] アイドルのため終了します。");
        server.close(() => process.exit(0));
      }
    }, 30_000);
    timer.unref();
  }

  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

/**
 * OS の既定ブラウザで URL を開く。
 * @param {string} url
 */
function openInBrowser(url) {
  const isWin = process.platform === "win32";
  const opener = process.platform === "darwin" ? "open" : isWin ? "cmd" : "xdg-open";
  const args = isWin ? ["/c", "start", "", url] : [url];
  const child = spawn(opener, args, { stdio: "ignore", detached: true });
  child.on("error", (e) => console.error(`[mdview] ブラウザ起動に失敗: ${e.message}`));
  child.unref();
}

main().catch((e) => {
  console.error(`[mdview] 予期しないエラー: ${e.message}`);
  process.exit(1);
});
