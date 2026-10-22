import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'

/**
 * 区切り文字。CSV はカンマ、TSV はタブを指定する。
 */
export type Delimiter = ',' | '\t'

/**
 * 行データ（セル値の二次元配列）を CSV/TSV 文字列へシリアライズする。
 *
 * 空文字を含むすべてのセルをダブルクォートで囲み、セル内のダブルクォートは `""` に二重化する（RFC 4180 準拠）。
 * 各行の末尾には LF が付与される。行が空の場合は空文字列を返す。
 *
 * @param rows 行データ
 * @param delimiter 区切り文字
 * @returns CSV/TSV 文字列
 */
export function serializeRows(
  rows: readonly (readonly string[])[],
  delimiter: Delimiter
): string {
  return stringify(rows as string[][], {
    delimiter,
    quoted: true,
    quoted_empty: true,
    record_delimiter: 'unix',
  })
}

/**
 * CSV/TSV 文字列を厳密にパースして行データ（セル値の二次元配列）へ変換する。
 *
 * 空行は無視する。列数が行ごとに異なっていてもエラーにしない。
 * ダブルクォートのエスケープが不正な場合は例外を投げる。
 *
 * @param content CSV/TSV 文字列
 * @param delimiter 区切り文字
 * @returns 行データ
 */
export function parseRowsStrict(
  content: string,
  delimiter: Delimiter
): string[][] {
  return parse(content, {
    delimiter,
    quote: '"',
    escape: '"',
    relax_column_count: true,
    skip_empty_lines: true,
  })
}

/**
 * ダブルクォートの二重化が行われていなかった旧形式のファイル向けの簡易パーサ。
 *
 * 1 行 1 レコードとみなして区切り文字で分割し、各セルの前後のダブルクォートを取り除く。
 * セル内に区切り文字を含む旧形式のファイルは正しく分割できない。
 *
 * @param content CSV/TSV 文字列
 * @param delimiter 区切り文字
 * @returns 行データ
 */
export function parseRowsLegacy(
  content: string,
  delimiter: Delimiter
): string[][] {
  return content
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) =>
      line.split(delimiter).map((cell) => cell.replace(/^"(.*)"$/, '$1'))
    )
}

/**
 * CSV/TSV 文字列をパースして行データへ変換する。
 *
 * 通常は厳密にパースする。過去のバージョンが出力したダブルクォート未エスケープのファイルなど、
 * 厳密なパースに失敗した場合は旧形式向けの簡易パーサへフォールバックする。
 *
 * @param content CSV/TSV 文字列
 * @param delimiter 区切り文字
 * @param onFallback フォールバック時に呼び出されるコールバック（厳密パースのエラーを受け取る）
 * @returns 行データ
 */
export function parseRows(
  content: string,
  delimiter: Delimiter,
  onFallback?: (error: Error) => void
): string[][] {
  try {
    return parseRowsStrict(content, delimiter)
  } catch (error) {
    onFallback?.(error as Error)
    return parseRowsLegacy(content, delimiter)
  }
}
