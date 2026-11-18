/* eslint-disable @typescript-eslint/no-floating-promises -- node:test の describe/it は戻り値を待つ必要がない */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isPeriodChanged, judgeAfterTimeout } from './period'

const BEFORE = '2025/11/17 - 2025/12/14'
const NEXT = '2025/10/20 - 2025/11/16'

describe('isPeriodChanged', () => {
  it('別の期間の見出しなら真', () => {
    assert.equal(isPeriodChanged(BEFORE, NEXT), true)
  })

  it('直前と同じ見出しなら偽', () => {
    assert.equal(isPeriodChanged(BEFORE, BEFORE), false)
  })

  it('前後の空白だけが違う同じ見出しなら偽', () => {
    assert.equal(isPeriodChanged(BEFORE, ` ${BEFORE} `), false)
  })

  it('Loading... なら偽', () => {
    assert.equal(isPeriodChanged(BEFORE, 'Loading...'), false)
  })

  it('前後に空白を含む Loading... なら偽', () => {
    assert.equal(isPeriodChanged(BEFORE, ' Loading... '), false)
  })

  it('現在の見出しが null なら偽', () => {
    assert.equal(isPeriodChanged(BEFORE, null), false)
  })

  it('直前の見出しが null でも、現在が別の期間なら真', () => {
    assert.equal(isPeriodChanged(null, NEXT), true)
  })
})

describe('judgeAfterTimeout', () => {
  it('最古期間: ボタンが有効でも見出しが変わらなければ oldest', () => {
    assert.equal(judgeAfterTimeout(BEFORE, BEFORE), 'oldest')
  })

  it('Loading... のままなら遅い切り替えとして loading', () => {
    assert.equal(judgeAfterTimeout(BEFORE, 'Loading...'), 'loading')
  })

  it('前後に空白を含む Loading... でも loading', () => {
    assert.equal(judgeAfterTimeout(BEFORE, ' Loading... '), 'loading')
  })

  it('別の期間へ切り替わっていれば changed', () => {
    assert.equal(judgeAfterTimeout(BEFORE, NEXT), 'changed')
  })

  it('現在の見出しが null なら unknown', () => {
    assert.equal(judgeAfterTimeout(BEFORE, null), 'unknown')
  })

  it('直前の見出しが null なら unknown', () => {
    assert.equal(judgeAfterTimeout(null, BEFORE), 'unknown')
  })
})
