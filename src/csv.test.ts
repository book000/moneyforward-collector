/* eslint-disable @typescript-eslint/no-floating-promises -- node:test の describe/it は戻り値を待つ必要がない */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  Delimiter,
  parseRows,
  parseRowsLegacy,
  parseRowsStrict,
  serializeRows,
} from './csv'

const delimiters: Delimiter[] = [',', '\t']

describe('serializeRows / parseRowsStrict', () => {
  for (const delimiter of delimiters) {
    const name = delimiter === ',' ? 'CSV' : 'TSV'

    it(`${name}: ダブルクォートを含む値が往復で同一になる`, () => {
      const rows = [['A"B', '"', '""', '"始まり', '終わり"', '日付']]
      const text = serializeRows(rows, delimiter)
      assert.deepEqual(parseRowsStrict(text, delimiter), rows)
    })

    it(`${name}: ダブルクォートが二重化される`, () => {
      assert.equal(
        serializeRows([['A"B', 'C']], delimiter),
        `"A""B"${delimiter}"C"\n`
      )
    })

    it(`${name}: 空欄もダブルクォートで囲まれる`, () => {
      assert.equal(
        serializeRows([['a', '', 'c']], delimiter),
        `"a"${delimiter}""${delimiter}"c"\n`
      )
    })

    it(`${name}: タブ、カンマ、改行、空欄を含む値が壊れない`, () => {
      const rows = [
        ['a,b', 'c\td', 'e\nf', 'g\r\nh', '', ' '],
        ['', '', '', '', '', ''],
        ['1', '2', '3', '4', '5', '6'],
      ]
      const text = serializeRows(rows, delimiter)
      assert.deepEqual(parseRowsStrict(text, delimiter), rows)
    })

    it(`${name}: 行ごとに列数が異なっていてもパースできる`, () => {
      const rows = [['a', 'b', 'c'], ['d']]
      const text = serializeRows(rows, delimiter)
      assert.deepEqual(parseRowsStrict(text, delimiter), rows)
    })

    it(`${name}: 行が空の場合は空文字列になる`, () => {
      assert.equal(serializeRows([], delimiter), '')
    })
  }
})

describe('parseRows', () => {
  it('ダブルクォートが未エスケープの旧形式ファイルは旧パーサへフォールバックする', () => {
    const legacy = '"日付","内容"\n"2021/01/01","A"B"\n'
    assert.throws(() => parseRowsStrict(legacy, ','))

    let fallbackCalled = false
    const rows = parseRows(legacy, ',', () => {
      fallbackCalled = true
    })
    assert.ok(fallbackCalled)
    assert.deepEqual(rows, [
      ['日付', '内容'],
      ['2021/01/01', 'A"B'],
    ])
  })

  it('正しい形式のファイルではフォールバックしない', () => {
    const text = serializeRows([['A"B', 'C']], ',')
    let fallbackCalled = false
    const rows = parseRows(text, ',', () => {
      fallbackCalled = true
    })
    assert.equal(fallbackCalled, false)
    assert.deepEqual(rows, [['A"B', 'C']])
  })
})

describe('parseRowsLegacy', () => {
  it('空行を無視し、前後のダブルクォートを取り除く', () => {
    assert.deepEqual(parseRowsLegacy('"a"\t"b"\n\n"c"\t""\n', '\t'), [
      ['a', 'b'],
      ['c', ''],
    ])
  })
})
