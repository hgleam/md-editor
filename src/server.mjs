/**
 * mdview のローカル HTTP サーバ。
 * Markdown フォルダをルートに、.md はレンダリング用 HTML（md 注入済み）を返し、
 * 画像などの生アセットはそのまま配信する。相対リンクがページ URL 基準で解決されるため、
 * .md 同士のリンクを辿って回遊できる。
 */
import { createServer as httpCreateServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep, basename } from "node:path";
import { injectHtml } from "./inject.mjs";

/** 拡張子 → Content-Type。未知は octet-stream にフォールバックする。 */
export const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/**
 * ファイルパスから Content-Type を判定する。
 * @param {string} filePath
 * @returns {string}
 */
export function contentTypeFor(filePath) {
  return CONTENT_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
}

/**
 * Markdown ファイル（.md / .markdown）かどうか。
 * @param {string} filePath
 * @returns {boolean}
 */
export function isMarkdown(filePath) {
  const e = extname(filePath).toLowerCase();
  return e === ".md" || e === ".markdown";
}

/**
 * URL パスを rootDir 配下の絶対パスへ安全に解決する。
 * ルート外へ抜ける（パストラバーサル）場合や不正な % エンコードは null を返す。
 * @param {string} rootDir - 公開ルートの絶対パス
 * @param {string} urlPath - リクエスト URL のパス（クエリ込み可）
 * @returns {string|null}
 */
export function resolveSafePath(rootDir, urlPath) {
  const rawPath = String(urlPath).split("?")[0].split("#")[0];
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  const relPath = decoded.replace(/^\/+/, "");
  const root = resolve(rootDir);
  const abs = resolve(root, relPath);
  if (abs !== root && !abs.startsWith(root + sep)) return null;
  return abs;
}

/**
 * ディレクトリが要求されたときに探す既定ファイル名（先頭優先）。
 * @param {string} initialFile
 * @returns {string[]}
 */
function directoryIndexCandidates(initialFile) {
  const list = ["README.md", "index.md", "readme.md"];
  if (initialFile && !list.includes(initialFile)) list.unshift(initialFile);
  return list;
}

/**
 * mdview 用の HTTP サーバを生成する（listen はしない）。
 * @param {object} opts
 * @param {string} opts.rootDir - 公開ルート（表示する md の親ディレクトリ）
 * @param {string} opts.template - index.html テンプレート文字列
 * @param {string} [opts.initialFile] - "/" で返す既定ファイル（basename）
 * @param {() => void} [opts.onActivity] - リクエスト受信時に呼ばれる（アイドル計測用）
 * @returns {import("node:http").Server}
 */
export function createMdServer({ rootDir, template, initialFile = "", onActivity }) {
  const root = resolve(rootDir);

  return httpCreateServer(async (req, res) => {
    if (onActivity) onActivity();
    try {
      const abs = resolveSafePath(root, req.url || "/");
      if (!abs) {
        res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
        res.end("403 Forbidden");
        return;
      }

      let target = abs;
      let info;
      try {
        info = await stat(target);
      } catch {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
        return;
      }

      if (info.isDirectory()) {
        let found = null;
        for (const cand of directoryIndexCandidates(initialFile)) {
          const p = join(target, cand);
          try {
            if ((await stat(p)).isFile()) {
              found = p;
              break;
            }
          } catch {
            /* 次の候補へ */
          }
        }
        if (!found) {
          res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
          res.end("404 Not Found");
          return;
        }
        target = found;
      }

      if (isMarkdown(target)) {
        const md = await readFile(target, "utf8");
        const html = injectHtml(template, md, basename(target));
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      const buf = await readFile(target);
      res.writeHead(200, { "content-type": contentTypeFor(target) });
      res.end(buf);
    } catch (e) {
      console.error("[mdview] リクエスト処理に失敗:", e);
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end("500 Internal Server Error");
    }
  });
}
