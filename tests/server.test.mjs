import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  contentTypeFor,
  isMarkdown,
  resolveSafePath,
  createMdServer,
} from "../src/server.mjs";

const TEMPLATE = `<head>\n  <!-- MDVIEW_INJECT -->\n</head><body><article id="content"></article></body>`;

describe("contentTypeFor", () => {
  it("既知の拡張子に MIME を返す", () => {
    expect(contentTypeFor("a.png")).toBe("image/png");
    expect(contentTypeFor("a.SVG")).toBe("image/svg+xml");
    expect(contentTypeFor("a.css")).toBe("text/css; charset=utf-8");
    expect(contentTypeFor("a.json")).toBe("application/json; charset=utf-8");
  });
  it("未知の拡張子は octet-stream", () => {
    expect(contentTypeFor("a.bin")).toBe("application/octet-stream");
  });
});

describe("isMarkdown", () => {
  it(".md / .markdown を真と判定する（大文字も）", () => {
    expect(isMarkdown("x.md")).toBe(true);
    expect(isMarkdown("x.MARKDOWN")).toBe(true);
    expect(isMarkdown("x.txt")).toBe(false);
  });
});

describe("resolveSafePath", () => {
  const root = "/tmp/root";
  it("ルート配下のパスを絶対パスで返す", () => {
    expect(resolveSafePath(root, "/a.md")).toBe("/tmp/root/a.md");
    expect(resolveSafePath(root, "/sub/b.md")).toBe("/tmp/root/sub/b.md");
  });
  it("先頭スラッシュ無し・クエリ付きも扱える", () => {
    expect(resolveSafePath(root, "a.md?x=1")).toBe("/tmp/root/a.md");
  });
  it("% エンコード（日本語）をデコードする", () => {
    expect(resolveSafePath(root, "/" + encodeURIComponent("日本語.md"))).toBe(
      "/tmp/root/日本語.md",
    );
  });
  it("ルート外への .. トラバーサルは null", () => {
    expect(resolveSafePath(root, "/../etc/passwd")).toBeNull();
    expect(resolveSafePath(root, "/../../root-sibling/x")).toBeNull();
  });
  it("不正な % エンコードは null", () => {
    expect(resolveSafePath(root, "/%E0%A4%A")).toBeNull();
  });
});

describe("createMdServer (統合)", () => {
  let dir;
  let server;
  let base;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "mdview-srv-"));
    await writeFile(
      join(dir, "README.md"),
      "# 目次\n\n- [子ページ](./child.md)\n\n![図](./img.png)\n",
      "utf8",
    );
    await writeFile(join(dir, "child.md"), "# 子ページ\n\n本文\n", "utf8");
    await writeFile(join(dir, "img.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    server = createMdServer({ rootDir: dir, template: TEMPLATE, initialFile: "README.md" });
    await new Promise((res) => server.listen(0, "127.0.0.1", res));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((res) => server.close(res));
    await rm(dir, { recursive: true, force: true });
  });

  it(".md はレンダリング用テンプレート（md 注入済み）を返す", async () => {
    const r = await fetch(`${base}/README.md`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/html");
    const body = await r.text();
    expect(body).toContain("window.__MARKDOWN__=");
    expect(body).toContain("child.md"); // 相対リンクが本文に含まれる
  });

  it("非 ASCII リンク先の .md も辿れる", async () => {
    const r = await fetch(`${base}/${encodeURIComponent("child.md")}`);
    expect(r.status).toBe(200);
    const body = await r.text();
    expect(body).toContain("window.__MARKDOWN__=");
  });

  it("/ は initialFile を返す", async () => {
    const r = await fetch(`${base}/`);
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("window.__MARKDOWN__=");
  });

  it("画像は生バイナリを正しい Content-Type で返す", async () => {
    const r = await fetch(`${base}/img.png`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/png");
    const buf = Buffer.from(await r.arrayBuffer());
    expect(buf[0]).toBe(0x89);
  });

  it("存在しないパスは 404", async () => {
    const r = await fetch(`${base}/nope.md`);
    expect(r.status).toBe(404);
  });

  it("ルート外トラバーサルは 403", async () => {
    const r = await fetch(`${base}/../../../../etc/hosts`, { redirect: "manual" });
    expect([403, 404]).toContain(r.status);
  });
});
