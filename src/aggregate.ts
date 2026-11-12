/**
 * 1 つの期間ファイルから読み取った行。
 */
export interface PeriodRows {
  /** 期間の開始日（YYYYMMDD） */
  start: string
  /** 期間の終了日（YYYYMMDD） */
  end: string
  /** 行データ。各行の先頭要素は YYYY/MM/DD 形式の日付 */
  rows: string[][]
}

/**
 * 期間が重なるファイル間の重複行を取り除く。
 * 開始日が大きい期間（同じなら終了日が大きい期間）を新しいとみなし、行の日付をより新しい期間が含む場合は、その行を捨てる。
 * 同一期間内の行は重複していても件数を保つ。
 *
 * @param periods 期間ごとの行。入力は変更しない
 * @returns 開始日昇順に連結した行。期間内の順序は保つ
 */
export function dropOverlappedRows(periods: readonly PeriodRows[]): string[][] {
  const sorted = [...periods].toSorted(
    (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end)
  )

  return sorted.flatMap((period, index) => {
    const newer = sorted.slice(index + 1)
    return period.rows.filter((row) => {
      const date = row[0].replaceAll('/', '')
      return newer.every((p) => !(p.start <= date && date <= p.end))
    })
  })
}
