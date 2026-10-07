import { describe, it, expect } from 'vitest'
import { angleFrom, cropFromDrag, rotationFromDrag } from './stickerDrag'

const zero = { l: 0, t: 0, r: 0, b: 0 }

describe('cropFromDrag', () => {
  it('moves the dragged edge in by the drag distance over the image size', () => {
    expect(cropFromDrag(zero, 'w', { dx: 20, dy: 0 }, 100)).toEqual({ l: 0.2, t: 0, r: 0, b: 0 })
    expect(cropFromDrag(zero, 'se', { dx: -10, dy: -30 }, 100)).toEqual({ l: 0, t: 0, r: 0.1, b: 0.3 })
  })

  it('never lets the crop swallow the image or go negative', () => {
    expect(cropFromDrag({ l: 0, t: 0, r: 0.5, b: 0 }, 'w', { dx: 500, dy: 0 }, 100).l).toBe(0.4)
    expect(cropFromDrag(zero, 'w', { dx: -50, dy: 0 }, 100).l).toBe(0)
  })

  it('follows the image rotation', () => {
    const c = cropFromDrag(zero, 'w', { dx: 0, dy: 20 }, 100, 90)
    expect(c.l).toBeCloseTo(0.2, 2)
  })
})

describe('rotation', () => {
  it('measures the angle clockwise from straight up', () => {
    expect(angleFrom({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(90)
    expect(angleFrom({ x: 0, y: 0 }, { x: 0, y: -10 })).toBeCloseTo(0)
  })

  it('snaps near quarter turns, and to fifteen degrees with shift', () => {
    expect(rotationFromDrag(0, 0, 88, false)).toBe(90)
    expect(rotationFromDrag(0, 0, 50, false)).toBe(50)
    expect(rotationFromDrag(0, 0, 50, true)).toBe(45)
    expect(rotationFromDrag(170, 0, 30, false)).toBe(-160)
  })
})
