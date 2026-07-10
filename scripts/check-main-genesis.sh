#!/usr/bin/env bash
# main genesis 監査（CI/ローカル用・自己完結）:
# 履歴のルートが「1個・README のみ」かを検証する。太い初回コミットや
# unrelated histories（複数ルート）を検出し、非準拠なら exit 1。
#
# 使い方: check-main-genesis.sh [ref]   # 既定 ref=HEAD
# CI では PR ブランチ HEAD を検査（全ブランチは README-only genesis に連なるべき）。
set -uo pipefail

REF="${1:-HEAD}"
roots=$(git rev-list --max-parents=0 "$REF" 2>/dev/null || true)
[ -z "$roots" ] && { echo "ERROR: ルートcommитが取得できません（fetch-depth: 0 か確認）" >&2; exit 2; }

count=$(printf '%s\n' "$roots" | grep -c .)
fail=0

if [ "$count" -ne 1 ]; then
  echo "❌ ルートが ${count} 個あります（1個であるべき＝unrelated histories 混入）:"
  printf '%s\n' "$roots" | while read -r r; do [ -n "$r" ] && echo "   - $(git log -1 --oneline "$r")"; done
  fail=1
fi

for r in $roots; do
  [ -z "$r" ] && continue
  nonreadme=$(git show --name-only --pretty=format: "$r" | grep -v '^$' | grep -viE '^readme(\.md)?$' || true)
  if [ -n "$nonreadme" ]; then
    echo "❌ ルート $(git rev-parse --short "$r") が README 以外を含む（＝太い初回コミット）:"
    printf '%s\n' "$nonreadme" | sed 's/^/     /'
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "✅ genesis OK: README-only の単一ルート（$(git rev-parse --short "$(printf '%s' "$roots" | head -1)")）"
  exit 0
fi
echo "=> 違反あり: main は初回READMEのみ・内容はPR経由（git ルール）。PRベースで是正してください。"
exit 1
