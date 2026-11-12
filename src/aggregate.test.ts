/* eslint-disable @typescript-eslint/no-floating-promises -- node:test の describe/it は戻り値を待つ必要がない */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dropOverlappedRows, PeriodRows } from './aggregate'

/**
 * テスト用の行を作る。
 *
 * @param date YYYY/MM/DD 形式の日付
 * @param content 内容
 * @returns 行データ
 */
function row(date: string, content: string): string[] {
  return [date, content, '-100']
}

describe('dropOverlappedRows', () => {
  it('重なる日付の行は新しい期間のものだけが残る', () => {
    const periods: PeriodRows[] = [
      {
        start: '20240101',
        end: '20240129',
        rows: [row('2024/01/10', '旧'), row('2024/01/20', '旧のみ')],
      },
      {
        start: '20240115',
        end: '20240212',
        rows: [row('2024/01/20', '新'), row('2024/02/01', '新のみ')],
      },
    ]
    assert.deepEqual(dropOverlappedRows(periods), [
      row('2024/01/10', '旧'),
      row('2024/01/20', '新'),
      row('2024/02/01', '新のみ'),
    ])
  })

  it('同一ファイル内の同一行は件数を保って残る', () => {
    const periods: PeriodRows[] = [
      {
        start: '20240101',
        end: '20240129',
        rows: [row('2024/01/10', 'A'), row('2024/01/10', 'A')],
      },
      {
        start: '20240110',
        end: '20240207',
        rows: [row('2024/01/10', 'A'), row('2024/01/10', 'A')],
      },
    ]
    assert.deepEqual(dropOverlappedRows(periods), [
      row('2024/01/10', 'A'),
      row('2024/01/10', 'A'),
    ])
  })

  it('新しい期間で取引が 0 件になった日付は古い期間にあっても残らない', () => {
    const periods: PeriodRows[] = [
      {
        start: '20240101',
        end: '20240129',
        rows: [row('2024/01/20', '削除済')],
      },
      { start: '20240115', end: '20240212', rows: [] },
    ]
    assert.deepEqual(dropOverlappedRows(periods), [])
  })

  it('重ならない期間は全行が残り、開始日昇順・期間内順になる', () => {
    const periods: PeriodRows[] = [
      {
        start: '20240201',
        end: '20240229',
        rows: [row('2024/02/02', 'C'), row('2024/02/03', 'D')],
      },
      {
        start: '20240101',
        end: '20240131',
        rows: [row('2024/01/02', 'A'), row('2024/01/03', 'B')],
      },
    ]
    assert.deepEqual(dropOverlappedRows(periods), [
      row('2024/01/02', 'A'),
      row('2024/01/03', 'B'),
      row('2024/02/02', 'C'),
      row('2024/02/03', 'D'),
    ])
  })

  it('新しい期間の終了日ちょうどの行は捨て、終了日より後の行は残る', () => {
    const periods: PeriodRows[] = [
      {
        start: '20240101',
        end: '20240229',
        rows: [row('2024/01/29', '終了日'), row('2024/01/30', '終了日の後')],
      },
      { start: '20240115', end: '20240129', rows: [] },
    ]
    assert.deepEqual(dropOverlappedRows(periods), [
      row('2024/01/30', '終了日の後'),
    ])
  })

  it('入力配列を変更しない', () => {
    const periods: PeriodRows[] = [
      { start: '20240201', end: '20240229', rows: [row('2024/02/02', 'C')] },
      { start: '20240101', end: '20240131', rows: [row('2024/01/02', 'A')] },
    ]
    const snapshot = structuredClone(periods)
    dropOverlappedRows(periods)
    assert.deepEqual(periods, snapshot)
  })

  it('開始日が同じなら終了日が大きい方が新しい', () => {
    const periods: PeriodRows[] = [
      { start: '20240101', end: '20240129', rows: [row('2024/01/10', '短')] },
      { start: '20240101', end: '20240215', rows: [row('2024/01/10', '長')] },
    ]
    assert.deepEqual(dropOverlappedRows(periods), [row('2024/01/10', '長')])
  })

  it('渡す順序を入れ替えても結果が同じになる', () => {
    const a: PeriodRows = {
      start: '20240101',
      end: '20240129',
      rows: [row('2024/01/10', '旧'), row('2024/01/20', '旧')],
    }
    const b: PeriodRows = {
      start: '20240115',
      end: '20240212',
      rows: [row('2024/01/20', '新')],
    }
    assert.deepEqual(dropOverlappedRows([a, b]), dropOverlappedRows([b, a]))
  })
})
