import { describe, it, expect } from 'vitest'
import { barHeights, linePoints } from './chartMath'

describe('barHeights', () => {
  it('scales to the tallest bar', () => {
    expect(barHeights([1, 2, 4], 100)).toEqual([25, 50, 100])
  })
  it('uses an explicit max when given', () => {
    expect(barHeights([7, 0], 70, 7)).toEqual([70, 0])
  })
  it('returns zeros, not NaN, when every value is zero or the list is empty', () => {
    expect(barHeights([0, 0, 0], 50)).toEqual([0, 0, 0])
    expect(barHeights([], 50)).toEqual([])
  })
})

describe('linePoints', () => {
  it('maps values across the width and flips y', () => {
    expect(linePoints([0, 100], 100, 50)).toEqual([[[0, 50], [100, 0]]])
  })
  it('splits segments at null', () => {
    const segs = linePoints([10, null, 20, 30], 90, 100)
    expect(segs).toHaveLength(2)
    expect(segs[0]).toHaveLength(1)
    expect(segs[1]).toHaveLength(2)
  })
  it('centers a single point and handles empty input', () => {
    expect(linePoints([50], 100, 100)).toEqual([[[50, 50]]])
    expect(linePoints([], 100, 100)).toEqual([])
    expect(linePoints([null, null], 100, 100)).toEqual([])
  })
  it('clamps out-of-range values', () => {
    expect(linePoints([150, -5], 10, 10)[0].map((p) => p[1])).toEqual([0, 10])
  })
})
