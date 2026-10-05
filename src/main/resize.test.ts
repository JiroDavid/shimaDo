import { describe, it, expect } from 'vitest'
import { fitOnScreen, resizeBounds, translateBounds } from './resize'

const start = { x: 100, y: 100, width: 400, height: 300 }
const min = { width: 200, height: 150 }
const max = { width: 1000, height: 800 }
const resize = (edge: Parameters<typeof resizeBounds>[1], dx: number, dy: number) => resizeBounds(start, edge, dx, dy, min, max)

describe('resizeBounds', () => {
  it('grows and shrinks from the south-east corner', () => {
    expect(resize('se', 50, 30)).toEqual({ x: 100, y: 100, width: 450, height: 330 })
    expect(resize('se', -100, -100)).toEqual({ x: 100, y: 100, width: 300, height: 200 })
  })
  it('moves the left edge and keeps the right edge anchored at the minimum', () => {
    expect(resize('w', 40, 0)).toEqual({ x: 140, y: 100, width: 360, height: 300 })
    expect(resize('w', 500, 0)).toEqual({ x: 300, y: 100, width: 200, height: 300 })
  })
  it('moves the top edge and keeps the bottom edge anchored at the minimum', () => {
    expect(resize('n', 0, -60)).toEqual({ x: 100, y: 40, width: 400, height: 360 })
    expect(resize('n', 0, 400)).toEqual({ x: 100, y: 250, width: 400, height: 150 })
  })
  it('respects the maximum size', () => {
    expect(resize('e', 2000, 0).width).toBe(1000)
    expect(resize('s', 0, 2000).height).toBe(800)
  })
  it('resizes both axes from a corner', () => {
    expect(resize('nw', 20, 10)).toEqual({ x: 120, y: 110, width: 380, height: 290 })
  })
  it('returns the same bounds for no movement', () => {
    for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const) expect(resize(edge, 0, 0)).toEqual(start)
  })
})

describe('translateBounds', () => {
  const from = { x: 0, y: 0, width: 1920, height: 1040 }
  const to = { x: 1920, y: 0, width: 1280, height: 720 }
  it('keeps the offset inside the new monitor', () => {
    expect(translateBounds({ x: 100, y: 50, width: 300, height: 200 }, from, to)).toEqual({ x: 2020, y: 50, width: 300, height: 200 })
  })
  it('clamps a rect that would overflow the target', () => {
    expect(translateBounds({ x: 1500, y: 600, width: 300, height: 200 }, from, to)).toEqual({ x: 2900, y: 520, width: 300, height: 200 })
  })
  it('shrinks a rect larger than the target', () => {
    expect(translateBounds({ x: 0, y: 0, width: 2000, height: 900 }, from, to)).toEqual({ x: 1920, y: 0, width: 1280, height: 720 })
  })
})

describe('fitOnScreen', () => {
  const areas = [{ x: 0, y: 0, width: 1920, height: 1040 }]
  const rect = { x: 100, y: 100, width: 400, height: 300 }
  it('leaves a visible rect alone', () => {
    expect(fitOnScreen(rect, areas)).toEqual(rect)
  })
  it('pulls back a rect left of every monitor', () => {
    expect(fitOnScreen({ ...rect, x: -9999 }, areas)).toEqual({ ...rect, x: 0 })
  })
  it('pulls back a rect that was on a monitor that is gone', () => {
    expect(fitOnScreen({ ...rect, x: 5000 }, areas)).toEqual({ ...rect, x: 1520 })
  })
  it('treats a sliver of overlap as off-screen', () => {
    expect(fitOnScreen({ ...rect, x: 1900 }, areas)).toEqual({ ...rect, x: 1520 })
  })
})
