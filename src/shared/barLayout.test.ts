import { describe, it, expect } from 'vitest'
import { barOrientation, barScale } from './barLayout'

describe('barOrientation', () => {
  it('is horizontal for wide and square windows and vertical for tall ones', () => {
    expect(barOrientation(600, 50)).toBe('horizontal')
    expect(barOrientation(100, 100)).toBe('horizontal')
    expect(barOrientation(50, 600)).toBe('vertical')
    expect(barOrientation(0, 0)).toBe('horizontal')
  })
})

describe('barScale', () => {
  it('fits the natural size of each orientation at scale 1', () => {
    expect(barScale(740, 56)).toEqual({ orientation: 'horizontal', k: 1 })
    expect(barScale(62, 580)).toEqual({ orientation: 'vertical', k: 1 })
  })
  it('scales to whichever dimension is the limit', () => {
    expect(barScale(1480, 56).k).toBe(1)
    expect(barScale(740, 28).k).toBeCloseTo(0.5, 5)
    expect(barScale(62, 290).k).toBeCloseTo(0.5, 5)
    expect(barScale(124, 2000).k).toBe(2)
  })
  it('clamps between 0.45 and 2.2', () => {
    expect(barScale(10, 10).k).toBe(0.45)
    expect(barScale(20, 3000).k).toBe(0.45)
    expect(barScale(40, 3000).k).toBeCloseTo(40 / 62, 5)
    expect(barScale(5000, 500).k).toBe(2.2)
  })
})
