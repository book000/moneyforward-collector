/** 期間切り替え待ちのタイムアウト後の状態。 */
export type PeriodChangeResult = 'changed' | 'oldest' | 'loading' | 'unknown'

/** 期間の切り替え中に見出しへ表示される文字列。 */
export const LOADING_HEADING = 'Loading...'

/**
 * 見出しが次の期間に切り替わったかを返す。
 * 見出しの比較は前後の空白を除いて行う。
 *
 * @param before 前の期間へ移動する前の見出し
 * @param current 現在の見出し
 * @returns 現在の見出しが `null`、`before` と同じ、または `Loading...` なら false
 */
export function isPeriodChanged(
  before: string | null,
  current: string | null
): boolean {
  if (current === null) {
    return false
  }
  const heading = current.trim()
  return heading !== LOADING_HEADING && heading !== before?.trim()
}

/**
 * 切り替え待ちがタイムアウトした後に、現在の見出しから状態を判定する。
 * 見出しの比較は前後の空白を除いて行う。
 *
 * @param before 前の期間へ移動する前の見出し
 * @param current タイムアウト後の見出し
 * @returns 判定結果。`before` と同じ見出しなら `oldest`、`Loading...` なら `loading`、
 * 別の見出しなら `changed`。どちらかが `null` で判定できない場合は `unknown`
 */
export function judgeAfterTimeout(
  before: string | null,
  current: string | null
): PeriodChangeResult {
  if (before === null || current === null) {
    return 'unknown'
  }
  const heading = current.trim()
  if (heading === LOADING_HEADING) {
    return 'loading'
  }
  return heading === before.trim() ? 'oldest' : 'changed'
}
