import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

describe("仕様書鮮度チェックの仕組み", () => {
  it("check-spec-freshness.sh が存在する", () => {
    expect(existsSync(join(ROOT, "scripts/check-spec-freshness.sh"))).toBe(true);
  });

  it("WATCH_PATTERNS が空でなくコードパターンを含む", () => {
    const sh = read("scripts/check-spec-freshness.sh");
    expect(sh).toContain("WATCH_PATTERNS=(");
    expect(sh).toContain('"src/*"');
    expect(sh).toContain('"bin/*"');
  });

  it("pre-commit hook (.husky/pre-commit) が存在する", () => {
    expect(existsSync(join(ROOT, ".husky/pre-commit"))).toBe(true);
  });

  it("pre-commit hook が check-spec-freshness.sh を呼ぶ", () => {
    expect(read(".husky/pre-commit")).toContain("check-spec-freshness.sh");
  });

  it("pre-commit hook が main/master 直コミットをブロックする", () => {
    const hook = read(".husky/pre-commit");
    expect(hook).toContain("main");
    expect(hook).toContain("exit 1");
  });

  it(".claude/rules/specification-update.md が存在する", () => {
    expect(existsSync(join(ROOT, ".claude/rules/specification-update.md"))).toBe(true);
  });

  it("docs/specification の client/develop README が存在する", () => {
    expect(existsSync(join(ROOT, "docs/specification/client/README.md"))).toBe(true);
    expect(existsSync(join(ROOT, "docs/specification/develop/README.md"))).toBe(true);
  });
});
