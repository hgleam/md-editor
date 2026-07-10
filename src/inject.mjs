/**
 * index.html テンプレートに Markdown 本文を埋め込む純粋関数。
 * ブラウザ側の marked / mermaid が描画するので、ここでは値の受け渡しだけ行う。
 */

const MARKER = "<!-- MDVIEW_INJECT -->";

/**
 * 値をインライン <script> に安全に埋め込める JS リテラル文字列へ変換する。
 * JSON 化した上で < > & をエスケープし、md 中の `</script>` 等でタグが閉じるのを防ぐ。
 * @param {unknown} value
 * @returns {string}
 */
function toScriptLiteral(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * テンプレート HTML に markdown / filename を注入した HTML を返す。
 * @param {string} template - index.html の内容
 * @param {string} markdown - 表示する Markdown 本文
 * @param {string} [filename] - ヘッダーに表示するファイル名
 * @returns {string}
 */
export function injectHtml(template, markdown, filename = "") {
  const payload =
    "<script>" +
    `window.__MARKDOWN__=${toScriptLiteral(markdown)};` +
    `window.__FILENAME__=${toScriptLiteral(filename)};` +
    "</scr" + "ipt>";

  if (template.includes(MARKER)) {
    return template.replace(MARKER, payload);
  }
  // マーカーが無い場合は </head> 直前に挿入する
  return template.replace("</head>", `${payload}\n</head>`);
}
