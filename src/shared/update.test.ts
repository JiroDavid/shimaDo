import { describe, it, expect } from 'vitest'
import { plainNotes } from './update'

describe('plainNotes', () => {
  it('strips html tags from a release body', () => {
    expect(plainNotes('<h2>New</h2><ul><li>Auto updates</li></ul>')).toBe('New Auto updates')
  })
  it('joins per-version note arrays', () => {
    expect(plainNotes([{ version: '0.6.0', note: 'One' }, { version: '0.5.1', note: 'Two' }])).toBe('One\n\nTwo')
  })
  it('returns an empty string for missing or odd values', () => {
    expect(plainNotes(undefined)).toBe('')
    expect(plainNotes(null)).toBe('')
    expect(plainNotes(42)).toBe('')
    expect(plainNotes([{ version: '1', note: null }])).toBe('')
  })
  it('truncates very long notes', () => {
    const out = plainNotes('a'.repeat(2000))
    expect(out.length).toBe(601)
    expect(out.endsWith('…')).toBe(true)
  })
})
