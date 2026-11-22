/* eslint-disable @typescript-eslint/no-floating-promises -- node:test の describe/it は戻り値を待つ必要がない */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { toAbsoluteUrls } from './html'

const BASE = 'https://moneyforward.com'

describe('toAbsoluteUrls', () => {
  it('末尾の / がない baseUrl で src を絶対 URL にする', () => {
    assert.equal(
      toAbsoluteUrls('<img src="/assets/test.png">', BASE),
      '<img src="https://moneyforward.com/assets/test.png">'
    )
  })

  it('末尾の / がある baseUrl でも同じ結果になる', () => {
    assert.equal(
      toAbsoluteUrls('<img src="/assets/test.png">', `${BASE}/`),
      '<img src="https://moneyforward.com/assets/test.png">'
    )
    assert.equal(
      toAbsoluteUrls('<a href="/cf">', `${BASE}/`),
      '<a href="https://moneyforward.com/cf">'
    )
  })

  it('href を絶対 URL にする', () => {
    assert.equal(
      toAbsoluteUrls('<a href="/cf">', BASE),
      '<a href="https://moneyforward.com/cf">'
    )
  })

  it('protocol-relative URL は baseUrl のスキームを引き継ぐ', () => {
    assert.equal(
      toAbsoluteUrls('<script src="//cdn.example/a.js"></script>', BASE),
      '<script src="https://cdn.example/a.js"></script>'
    )
    assert.equal(
      toAbsoluteUrls(
        '<script src="//cdn.example/a.js"></script>',
        'http://localhost:3000'
      ),
      '<script src="http://cdn.example/a.js"></script>'
    )
  })

  it('/ で始まらない値は変更しない', () => {
    const html =
      '<img src="https://other.example/a.png"><a href="#top"></a><a href="foo/bar"></a>'
    assert.equal(toAbsoluteUrls(html, BASE), html)
  })

  it('値に $& を含んでも置換パターンとして解釈しない', () => {
    assert.equal(
      toAbsoluteUrls('<img src="/a$&b">', BASE),
      '<img src="https://moneyforward.com/a$&b">'
    )
  })

  it('複数の href と src をすべて書き換える', () => {
    assert.equal(
      toAbsoluteUrls(
        '<a href="/a"></a><img src="/b.png"><link href="/c.css"><script src="//d.example/e.js"></script>',
        BASE
      ),
      '<a href="https://moneyforward.com/a"></a><img src="https://moneyforward.com/b.png"><link href="https://moneyforward.com/c.css"><script src="https://d.example/e.js"></script>'
    )
  })
})
