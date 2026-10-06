import { describe, it, expect } from 'vitest'
import { EMOJI_GROUPS, isEmoji } from './emoji'

describe('isEmoji', () => {
  it.each(['😀', '👍🏽', '👨‍👩‍👧', '🇯🇵', '1️⃣', '❤️', '⭐', '✌️', '☕', '🏳️‍🌈'])('accepts %s', (e) => {
    expect(isEmoji(e)).toBe(true)
  })

  it.each(['', 'a', '1', '#', '😀a', 'a😀', '<b>', '😀;', '{😀}', '\u200B', '\u200D', '\uFE0F', ' ', '😀 ', 'hello', '😀'.repeat(9)])('rejects %j', (e) => {
    expect(isEmoji(e)).toBe(false)
  })

  it('rejects non-strings', () => {
    for (const v of [null, undefined, 5, {}, []]) expect(isEmoji(v)).toBe(false)
  })
})

describe('EMOJI_GROUPS', () => {
  it('only contains valid, unique emoji in non-trivial groups', () => {
    const seen = new Set<string>()
    for (const g of EMOJI_GROUPS) {
      expect(g.name.length).toBeGreaterThan(0)
      expect(g.emoji.length).toBeGreaterThanOrEqual(12)
      for (const e of g.emoji) {
        expect(isEmoji(e), e).toBe(true)
        expect(seen.has(e), e).toBe(false)
        seen.add(e)
      }
    }
  })
})
