# md-editor / mdview — 開発者向け仕様書

最終更新: 2026-07-10

## 技術スタック

- Node.js（ESM, `"type": "module"`）／依存の実行時ランタイムなし（標準 `node:http` 等のみ）
- ブラウザ側描画: [marked](https://github.com/markedjs/marked) 12 / [mermaid](https://github.com/mermaid-js/mermaid) 10 / [highlight.js](https://github.com/highlightjs/highlight.js) 11（すべて CDN）
- テスト: [Vitest](https://vitest.dev/) 2

## ディレクトリ構成

```
md-editor/
├── index.html            # 描画テンプレート（marked + mermaid + highlight.js、テーマ CSS）
├── bin/mdview.mjs        # CLI 本体（ローカルサーバ起動 → 既定ブラウザで開く）
├── src/server.mjs        # ローカル HTTP サーバ（md レンダリング配信＋生アセット配信＋403/404）
├── src/inject.mjs        # md 本文を index.html に安全注入するロジック
├── tests/server.test.mjs # server のテスト（Vitest）
├── tests/inject.test.mjs # inject のテスト（Vitest）
└── sample.md             # 動作確認用サンプル
```

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

## 設計判断

- **一時ファイル方式 → ローカルサーバ方式へ変更**: 当初は md を `/tmp` の一時 HTML に書き出して開いていたが、相対リンクが一時ディレクトリ基準で解決され `.md` 間リンクが辿れなかった。親フォルダをサーバのルートにすることで、相対リンクの回遊とレンダリングを両立した。
- **highlight.js テーマの配色モード切替**: 従来ライトテーマ固定で、ダークモード時にコード文字が暗背景へ同化した。`media="(prefers-color-scheme: ...)"` でライト/ダークのテーマを切替、コードブロックに枠線を追加して解消。
