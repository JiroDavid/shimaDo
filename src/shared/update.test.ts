import { describe, it, expect } from 'vitest'
import { plainNotes, shouldRaisePrompt, type UpdateState } from './update'

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

describe('shouldRaisePrompt', () => {
  const dl = (percent: number): UpdateState => ({ kind: 'downloading', version: '0.6.0', percent })
  it('raises the prompt when an update appears or finishes', () => {
    expect(shouldRaisePrompt({ kind: 'idle' }, { kind: 'available', version: '0.6.0', notes: '' })).toBe(true)
    expect(shouldRaisePrompt(dl(100), { kind: 'ready', version: '0.6.0' })).toBe(true)
    expect(shouldRaisePrompt(dl(10), { kind: 'error', during: 'download', message: 'x', version: '0.6.0' })).toBe(true)
  })
  it('does not re-raise on each progress tick', () => {
    expect(shouldRaisePrompt(dl(10), dl(11))).toBe(false)
  })
  it('raises for a repeated identical state such as a manual re-check', () => {
    expect(shouldRaisePrompt(dl(10), dl(10))).toBe(true)
  })
  it('never raises for idle, current or check errors', () => {
    expect(shouldRaisePrompt(dl(10), { kind: 'idle' })).toBe(false)
    expect(shouldRaisePrompt({ kind: 'idle' }, { kind: 'current' })).toBe(false)
    expect(shouldRaisePrompt({ kind: 'idle' }, { kind: 'error', during: 'check', message: 'x' })).toBe(false)
  })
})
