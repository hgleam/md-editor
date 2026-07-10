# mdview 動作確認サンプル

これは **mdview** の表示テスト用ファイルです。

## テキスト装飾

- **太字**、*斜体*、`インラインコード`
- [リンク](https://example.com)
- 引用:

> 引用ブロックはこのように表示されます。

## コードハイライト

```js
const greet = (name) => `Hello, ${name}!`;
console.log(greet("world"));
```

## mermaid フローチャート

```mermaid
flowchart LR
  A[Markdown] --> B{mermaid?}
  B -- yes --> C[図として描画]
  B -- no --> D[テキスト表示]
```

## mermaid シーケンス図

```mermaid
sequenceDiagram
  participant U as ユーザー
  participant CLI as mdview
  participant B as ブラウザ
  U->>CLI: mdview sample.md
  CLI->>B: 一時HTMLを開く
  B-->>U: 図つきで表示
```

## 表

| 機能 | 対応 |
|------|:----:|
| 見出し・表・引用 | ✅ |
| コードハイライト | ✅ |
| mermaid 描画 | ✅ |
