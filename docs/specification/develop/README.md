# md-editor / mdview — 開発者向け仕様書

最終更新: 2026-07-10

## 技術スタック

- Node.js（ESM, `"type": "module"`）／依存の実行時ランタイムなし（標準 `node:http` 等のみ）
- ブラウザ側描画: [marked](https://github.com/markedjs/marked) 12 / [mermaid](https://github.com/mermaid-js/mermaid) 10 / [highlight.js](https://github.com/highlightjs/highlight.js) 11（すべて CDN）
- テスト: [Vitest](https://vitest.dev/) 2

## ディレクトリ構成

リポジトリ全体の構成図の正本は**ルート [README.md](../../../README.md)**、`docs/` 配下は
[docs/README.md](../../README.md)。ここでは重複を持たない（同じ事実を2箇所に置くと
静かにドリフトするため。`tests/test_doc_tree.py` が複製を検出する）。

各モジュールの責務は下記「全体の流れ」を参照。

## トピック

| トピック | 概要 |
|---------|------|
| [server](server.md) | ローカル HTTP サーバのルーティング・Content-Type・安全性・ライフサイクル |
| [ci](ci.md) | CI（GitHub Actions）・auto-merge・main 保護 ruleset の運用 |

## 全体の流れ

1. `bin/mdview.mjs` が引数の md を検証し、その**親ディレクトリをルート**に `src/server.mjs` の HTTP サーバを `127.0.0.1:0`（空きポート自動割当）で起動する。
2. `open`（macOS）/ `xdg-open`（Linux）/ `start`（Windows）で `http://127.0.0.1:<port>/<initialFile>` を既定ブラウザに開く。
3. サーバは `.md`/`.markdown` を `index.html` に注入した HTML として返し（`src/inject.mjs`）、画像などは生配信する。
4. ブラウザ側で marked が描画、mermaid が図を描画、highlight.js がコードをハイライトする。相対リンクはページ URL 基準で解決されるためサーバへ戻り、リンク先 md も同様にレンダリングされる。

## テスト

- 実行: `npm test`（`vitest run`）
- `tests/inject.test.mjs`（4 件）: 注入・エスケープ・復元。
- `tests/server.test.mjs`（14 件）: Content-Type / isMarkdown / パス解決（トラバーサル・%デコード）／統合（.md レンダリング・生アセット・`/`・404・403）。
- `tests/spec-freshness.test.mjs`: 仕様書鮮度チェックの仕組みが揃っているかの構造テスト。

### ドキュメント整合（2026-07-27 追加）

コードを直して**文書だけ古い**状態は、Vitest が緑でも起こる。実際、このリポジトリの構成図は
`scripts/` `docs/` `tests/spec-freshness.test.mjs` が載っていない状態だった。機械照合する。

- `tests/test_doc_tree.py` — 構成ツリー ↔ 実ファイルを**双方向**照合（漏れ／幽霊）。ツリーの
  正本は2箇所で担当範囲が重ならない（全体＝ルート `README.md` / `docs/` 配下＝`docs/README.md`）。
  このファイルにあったツリーは重複のためリンクへ変更した。
- `tests/test_doc_facts.py` — `MDVIEW_IDLE_MIN` の既定（`bin/mdview.mjs`）と文書の記載を照合。
  アイドル終了は「知らないうちにサーバが落ちる/落ちない」の体感に直結するため。
- `tests/test_doc_dedup.py` — 文書間の再掲（本文で40文字以上の同一行が2文書にあれば FAIL。
  出典行は対象外）。

**Node プロジェクトだが Python で書いてある**: 検査対象は Markdown で言語非依存であり、
雛形（`~/claude-private/.claude/skills/init/templates/`）を各プロジェクトへ**そのまま配れる**
利点を取った。移植すると雛形の修正が各リポジトリへ届かなくなる。実行は `python3 <file>` 直、
または `.husky/pre-commit` と CI の `Doc integrity` から。

## 設計判断

- **一時ファイル方式 → ローカルサーバ方式へ変更**: 当初は md を `/tmp` の一時 HTML に書き出して開いていたが、相対リンクが一時ディレクトリ基準で解決され `.md` 間リンクが辿れなかった。親フォルダをサーバのルートにすることで、相対リンクの回遊とレンダリングを両立した。
- **highlight.js テーマの配色モード切替**: 従来ライトテーマ固定で、ダークモード時にコード文字が暗背景へ同化した。`media="(prefers-color-scheme: ...)"` でライト/ダークのテーマを切替、コードブロックに枠線を追加して解消。
