/**
 * HTML 中の `href` と `src` の属性値のうち `/` で始まるものを絶対 URL に書き換える。
 * `//host/path` はスキームだけを `baseUrl` から引き継ぎ、`/path` は `baseUrl` の末尾の `/` を除いて連結する。
 *
 * @param html 書き換え対象の HTML
 * @param baseUrl スキーム付きの絶対 URL。末尾の `/` は有無を問わない
 * @returns 書き換え後の HTML
 * @throws `//` で始まる値があり、`baseUrl` が URL として不正な場合
 */
export function toAbsoluteUrls(html: string, baseUrl: string): string {
  return html.replaceAll(
    /(href|src)="(\/[^"]*)"/g,
    (_match, attribute: string, value: string) => {
      const url = value.startsWith('//')
        ? `${new URL(baseUrl).protocol}${value}`
        : `${baseUrl.replace(/\/+$/, '')}${value}`
      return `${attribute}="${url}"`
    }
  )
}
