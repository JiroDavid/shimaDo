import { describe, it, expect } from 'vitest'
import { boxCentre, floatBounds, pointInRect, positionFromCentre } from './float'

describe('floatBounds', () => {
  it('fits an unrotated image exactly', () => {
    expect(floatBounds({ x: 100, y: 200, size: 120 })).toEqual({ x: 100, y: 200, width: 120, height: 120 })
  })

  it('grows to the rotated bounding box around the same centre', () => {
    const b = floatBounds({ x: 0, y: 0, size: 100, rotation: 45 })
    expect(b.width).toBe(142)
    expect(b.x + b.width / 2).toBeCloseTo(50, 0)
    expect(b.y + b.height / 2).toBeCloseTo(50, 0)
  })

  it('follows the cropped box rather than the full image', () => {
    const b = floatBounds({ x: 0, y: 0, size: 100, crop: { l: 0.5, t: 0, r: 0, b: 0 } })
    expect(b).toEqual({ x: 50, y: 0, width: 50, height: 100 })
  })

  it('uses the whole image while it is being cropped', () => {
    const crop = { l: 0.5, t: 0, r: 0, b: 0 }
    expect(floatBounds({ x: 0, y: 0, size: 100, crop }, true)).toEqual({ x: 0, y: 0, width: 100, height: 100 })
  })

  it('never collapses to nothing', () => {
    expect(floatBounds({ x: 0, y: 0, size: 16 }).width).toBeGreaterThanOrEqual(8)
  })
})

describe('positions', () => {
  it('turns a window centre back into the top-left of the full image box', () => {
    const s = { size: 100, crop: { l: 0.2, t: 0, r: 0, b: 0 } }
    const c = boxCentre({ x: 300, y: 400, ...s })
    expect(positionFromCentre(c.x, c.y, s)).toEqual({ x: 300, y: 400 })
  })

  it('tests whether a point is inside a rectangle', () => {
    const r = { x: 10, y: 10, width: 20, height: 20 }
    expect(pointInRect({ x: 10, y: 10 }, r)).toBe(true)
    expect(pointInRect({ x: 30, y: 10 }, r)).toBe(false)
  })
})
