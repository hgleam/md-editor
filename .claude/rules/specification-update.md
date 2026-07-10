# 仕様書更新の義務

機能実装・バグ修正・UI変更を行ったら、**同じコミット内で** `docs/specification/` を更新する。

## 発火条件

- メインコードの変更（`scripts/check-spec-freshness.sh` の `WATCH_PATTERNS`: `bin/*`, `src/*`, `index.html`, `.github/workflows/*`）
- 新しい機能・挙動変更（サーバのルーティング/Content-Type/安全性、描画テンプレートの変更）
- 環境変数・依存ライブラリの追加

## 必須アクション

1. `docs/specification/client/`（依頼者向け）: ユーザーに見える変更を該当トピック（無ければ `client/README.md`）に反映
2. `docs/specification/develop/`（開発者向け）: 構成・サーバ挙動・テスト・設計判断を該当トピック（`develop/server.md` 等、無ければ `develop/README.md`）に反映
3. `docs/specification/` が存在しない場合は作成する（`specification` スキル参照）

## 禁止

- 「後でまとめて更新する」
- 「内部実装だから仕様書不要」（ユーザー体感が変わるなら仕様変更）
- 仕様書未更新のままコミット・PR作成する
