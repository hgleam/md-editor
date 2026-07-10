# server — ローカル HTTP サーバ

最終更新: 2026-07-10

`src/server.mjs`。表示対象 md の親ディレクトリ（`rootDir`）をルートに公開する読み取り専用 HTTP サーバ。`bin/mdview.mjs` が `127.0.0.1` の空きポートで起動する。

## 公開 API

| 関数 | 役割 |
|------|------|
| `createMdServer({ rootDir, template, initialFile, onActivity })` | `http.Server` を生成（listen はしない）。`onActivity` は各リクエストで呼ばれ、アイドル計測に使う |
| `contentTypeFor(filePath)` | 拡張子 → Content-Type。未知は `application/octet-stream` |
| `isMarkdown(filePath)` | 拡張子が `.md` / `.markdown` か（大小無視） |
| `resolveSafePath(rootDir, urlPath)` | URL パスを `rootDir` 配下の絶対パスへ解決。ルート外・不正 % エンコードは `null` |

## ルーティング

リクエスト URL のパスを `resolveSafePath` で解決してから分岐する。

| 条件 | レスポンス |
|------|-----------|
| パス解決が `null`（ルート外トラバーサル / 不正 % エンコード） | `403` text/plain |
| 対象が存在しない | `404` text/plain |
| 対象がディレクトリ | 既定ファイルを探索（下記）。無ければ `404` |
| 対象が `.md` / `.markdown` | `index.html` に md を注入した HTML を `200 text/html` |
| その他のファイル（画像等） | 生バイナリを `200` ＋ `contentTypeFor()` |
| 処理中に例外 | `500` text/plain（`console.error` でログ） |

- ディレクトリ既定ファイルの探索順: `initialFile`（重複時を除く） → `README.md` → `index.md` → `readme.md`。`/`（＝ルート）も同様に解決され、実質 `initialFile` を返す。

## Content-Type マップ

`CONTENT_TYPES`（抜粋）: `.html/.css/.js/.mjs/.json/.txt` はテキスト系（`charset=utf-8`）、`.png/.jpg/.jpeg/.gif/.svg/.webp/.avif/.ico/.bmp` は画像、`.pdf/.mp4/.webm/.mp3/.woff/.woff2` も定義。未定義拡張子は `application/octet-stream`。

## 安全性

- **パストラバーサル遮断**: `resolveSafePath` は URL を `decodeURIComponent` → 先頭スラッシュ除去 → `resolve(root, rel)` し、結果が `root` 自身または `root + path.sep` 配下でなければ `null`（→ 403）。クエリ（`?`）・ハッシュ（`#`）以降は無視。
- **読み取り専用**: GET 相当の配信のみ。書き込み系エンドポイントは持たない。
- **待ち受けは 127.0.0.1**（`bin/mdview.mjs` の `listen`）。外部からは接続できない。

## ライフサイクル（bin/mdview.mjs）

- `listen(0, "127.0.0.1")` で空きポートを自動割当し、`http://127.0.0.1:<port>/<encodeURIComponent(initialFile)>` をブラウザで開く。
- **アイドル自動終了**: `MDVIEW_IDLE_MIN`（既定 30、`0` で無効）分アクセスが無ければ `server.close()` → `process.exit(0)`。30 秒間隔の `setInterval`（`unref`）で監視。
- `SIGINT` / `SIGTERM` で `server.close()` → 終了。

## md 注入（src/inject.mjs）

- `injectHtml(template, markdown, filename)` は `window.__MARKDOWN__` / `window.__FILENAME__` を定義するインライン `<script>` を `<!-- MDVIEW_INJECT -->` マーカー（無ければ `</head>` 直前）へ挿入する。
- 値は `JSON.stringify` 後に `<`,`>`,`&` を `<` 等へエスケープし、md 中の `</script>` でタグが閉じるのを防ぐ。
- ブラウザ側（`index.html`）は `window.__MARKDOWN__` があればそれを、無ければサンプルを marked で描画する。
