# ドキュメント目次

## ディレクトリ構成

`docs/` 配下の構成図の正本はここ（リポジトリ全体の構成図は [../README.md](../README.md)。
あちらは `docs/` を1行に畳んでここへリンクする＝同じ事実を二重に持たない）。

```
docs/
├── README.md                       # この目次（docs 配下の構成図）
├── design-notes/README.md          # 未確定の論点
└── specification/
    ├── README.md                   # 仕様書の入口（client / develop の使い分け）
    ├── client/README.md            # 使う人向け（できること・前提・受け入れ基準）
    └── develop/
        ├── README.md               # 開発者向けの入口
        ├── server.md               # ローカルサーバの仕様（配信・アイドル終了）
        └── ci.md                   # CI / auto-merge の構成
```

ファイルを足す/消すときはこのツリーも同じコミットで直す（`tests/test_doc_tree.py` が
双方向で検証する）。

## 領域の使い分け

| 領域 | 何を書くか | いつ更新するか | 入口 |
|------|-----------|---------------|------|
| 仕様書 `specification/` | 結果＝いま何がどうなっているか | 仕様変更と同コミット（freshness 強制） | [specification/README.md](specification/README.md) |
| 設計メモ `design-notes/` | 未確定の論点 | 論点発生時／確定で仕様書へ移す | [design-notes/README.md](design-notes/README.md) |
