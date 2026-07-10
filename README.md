# md-editor / mdview

[![CI](https://github.com/hgleam/md-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/hgleam/md-editor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-informational.svg)](LICENSE)

指定した Markdown ファイルを既定ブラウザで表示する簡易ビューア。**mermaid のコードブロックは図として描画**されます。**フォルダをローカル HTTP サーバで公開する**ため、`.md` 同士の相対リンクや画像を辿って回遊できます。

## 使い方

```bash
mdview path/to/file.md
```

指定した md の**親フォルダをルートにローカルサーバを起動**し、既定ブラウザで開きます。ページ内の相対リンク（`./other.md`・画像）はサーバ経由で解決されるため、リンクを辿ると**リンク先の md もレンダリング表示**されます。

- サーバは常駐します。**Ctrl-C** で終了、または一定時間アクセスが無ければ自動終了します（既定 30 分）。
- 自動終了までの分数は環境変数 `MDVIEW_IDLE_MIN` で変更できます（`0` で無効）。

グローバルコマンドとして使うには一度だけ:

```bash
npm link      # `mdview` を PATH に登録
```

link せずに使う場合:

```bash
node bin/mdview.mjs path/to/file.md
```

## 構成

```
md-editor/
├── index.html            # 描画テンプレート（marked + mermaid + highlight.js）
├── bin/mdview.mjs        # CLI 本体（ローカルサーバを起動してブラウザで開く）
├── src/inject.mjs        # md 本文を HTML に安全注入するロジック
├── src/server.mjs        # ローカル HTTP サーバ（md レンダリング配信＋生アセット配信）
├── tests/inject.test.mjs   # inject のテスト（Vitest）
├── tests/server.test.mjs   # server のテスト（Vitest）
└── sample.md             # 動作確認用サンプル
```

## テスト

```bash
npm install
npm test
```

## 仕組み

- Markdown のパースと描画はブラウザ側の [marked](https://github.com/markedjs/marked) が担当
- mermaid 図は [mermaid](https://github.com/mermaid-js/mermaid) が描画
- コードハイライトは [highlight.js](https://github.com/highlightjs/highlight.js)
- CLI（`bin/mdview.mjs`）は md の親フォルダをルートに `src/server.mjs` のローカルサーバを起動し、既定ブラウザで開く
- サーバは `.md`/`.markdown` を `index.html` に注入した HTML として返し、画像などの生アセットはそのまま配信する。相対リンクがページ URL 基準で解決されるため、md 同士のリンクを辿って回遊できる
- ルート外へのパストラバーサルは 403 で遮断する

## 注意

- mermaid / highlight.js / marked を **CDN から読み込む**ため、表示時にネット接続が必要です。
  完全オフライン化する場合はライブラリをローカル同梱に変更してください。

## ライセンス

[MIT](LICENSE) © hgleam
