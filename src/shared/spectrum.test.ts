import { describe, it, expect } from 'vitest'
import { spectrumBars } from './spectrum'

describe('spectrumBars', () => {
  it('returns the requested number of values between 0 and 1', () => {
    const freq = Uint8Array.from({ length: 128 }, (_, i) => (i * 7) % 256)
    const out = spectrumBars(freq, 24, null)
    expect(out).toHaveLength(24)
    for (const v of out) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
  it('gives zeros for silence', () => {
    expect(spectrumBars(new Uint8Array(128), 16, null).every((v) => v === 0)).toBe(true)
  })
  it('lets bars fall gradually instead of dropping to zero', () => {
    const out = spectrumBars(new Uint8Array(128), 4, [1, 1, 1, 1])
    expect(out.every((v) => v > 0.8 && v < 1)).toBe(true)
  })
  it('lets bars jump up immediately', () => {
    expect(spectrumBars(new Uint8Array(128).fill(255), 4, [0, 0, 0, 0]).every((v) => v === 1)).toBe(true)
  })
  it('spreads low frequencies over the left bars', () => {
    const freq = new Uint8Array(128)
    freq.fill(255, 1, 3)
    const out = spectrumBars(freq, 16, null)
    expect(out[0]).toBeGreaterThan(out[15])
    expect(out[15]).toBe(0)
  })
  it('copes with an empty reading and a zero count', () => {
    expect(spectrumBars(new Uint8Array(0), 8, null)).toHaveLength(8)
    expect(spectrumBars(new Uint8Array(128), 0, null)).toEqual([])
  })
})
