import { describe, it, expect } from "vitest";
import { injectHtml } from "../src/inject.mjs";

const TEMPLATE = `<head>\n  <!-- MDVIEW_INJECT -->\n</head><body></body>`;

describe("injectHtml", () => {
  it("マーカーを md/filename 埋め込み script に置換する", () => {
    const out = injectHtml(TEMPLATE, "# hi", "a.md");
    expect(out).toContain("window.__MARKDOWN__=");
    expect(out).toContain("window.__FILENAME__=");
    expect(out).toContain('"a.md"');
    expect(out).not.toContain("<!-- MDVIEW_INJECT -->");
  });

  it("md 内の </script> でタグが閉じないよう < をエスケープする", () => {
    const out = injectHtml(TEMPLATE, "text </script> more", "x.md");
    // 生の </script> がそのまま残ってはいけない（< にエスケープされる）
    expect(out).not.toContain("</script> more");
    expect(out).toContain("\\u003c/script");
  });

  it("マーカーが無ければ </head> 直前に挿入する", () => {
    const out = injectHtml("<head></head>", "# hi", "");
    expect(out).toContain("window.__MARKDOWN__=");
    expect(out.indexOf("window.__MARKDOWN__")).toBeLessThan(out.indexOf("</head>"));
  });

  it("注入した script は復元すると元の md と一致する", () => {
    const md = "# 見出し\n\n```mermaid\nflowchart LR\n A-->B\n```";
    const out = injectHtml(TEMPLATE, md, "s.md");
    const m = out.match(/window\.__MARKDOWN__=(.*?);window\.__FILENAME__=/s);
    expect(m).not.toBeNull();
    // エスケープを戻して JSON.parse すれば元に戻る
    const restored = JSON.parse(
      m[1].replace(/\\u003c/g, "<").replace(/\\u003e/g, ">").replace(/\\u0026/g, "&")
    );
    expect(restored).toBe(md);
  });
});
