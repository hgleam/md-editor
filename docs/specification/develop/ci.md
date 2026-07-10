# CI ＋ auto-merge

最終更新: 2026-07-10

GitHub Actions で PR をゲートし、緑になってからマージする運用。

## 構成

| 要素 | 実体 | 役割 |
|------|------|------|
| CI | `.github/workflows/ci.yml`（ジョブ名 `test`） | PR/push で genesis 監査 → `npm ci` → `npm test`。これがマージのゲート |
| genesis 監査 | `scripts/check-main-genesis.sh` | 履歴ルートが「README のみの単一ルート」かを検証（太い初回コミット・複数ルートを検出） |
| auto-merge トグル | `scripts/automerge.sh on\|off\|status` | リポジトリ設定 `allow_auto_merge` / `delete_branch_on_merge` を切替 |
| main 保護 ruleset | GitHub ruleset「main protection」 | PR 必須（承認0）＋必須チェック `test` ＋ force push 禁止 |

## CI ジョブ

- Node.js 20（`actions/setup-node`、npm キャッシュ）
- `fetch-depth: 0`（genesis 監査に全履歴が必要）
- ステップ: genesis 監査 → `npm ci` → `npm test`（Vitest 25 件）

## 運用

```bash
scripts/automerge.sh status        # 現在の状態
scripts/automerge.sh on            # auto-merge 有効化（＋マージ後ブランチ削除）
scripts/automerge.sh off           # 無効化（手動マージ運用へ）
gh pr merge <N> --auto --squash    # CI 緑になったら自動マージするよう予約
```

- ruleset の必須チェックが `test` のため、CI が緑になるまで auto-merge は待つ。
- 承認必須数は 0（ソロ運用の自己マージ可）。

## 未導入（任意）

- 完全自動化（PR open で auto-merge を自動予約する `auto-merge.yml` ＋ マージ済みブランチを掃除する schedule ワークフロー）は未導入。大量 PR・改善ループ運用が必要になったら `ci-automerge` スキル §5 で追加する。
