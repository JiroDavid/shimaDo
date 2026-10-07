import { describe, it, expect } from 'vitest'
import { ZOOM_MAX, ZOOM_MIN, clampZoom, isZoomAction, stepZoom } from './zoom'

describe('stepZoom', () => {
  it('walks the step table in and out from 100%', () => {
    expect(stepZoom(1, 'in')).toBe(1.1)
    expect(stepZoom(1.1, 'in')).toBe(1.25)
    expect(stepZoom(1, 'out')).toBe(0.9)
    let z = 1
    const seen: number[] = []
    for (let i = 0; i < 15; i++) {
      z = stepZoom(z, 'out')
      seen.push(z)
    }
    expect(seen.slice(-3)).toEqual([0.1, 0.1, 0.1])
    expect(seen[9]).toBe(0.15)
  })

  it('goes much further out than before, with finer steps at the small end', () => {
    expect(ZOOM_MIN).toBeLessThanOrEqual(0.1)
    expect(stepZoom(0.3, 'out')).toBe(0.25)
    expect(stepZoom(0.2, 'out')).toBe(0.15)
  })

  it('stops at the limits and resets to 1', () => {
    expect(stepZoom(ZOOM_MAX, 'in')).toBe(ZOOM_MAX)
    expect(stepZoom(ZOOM_MIN, 'out')).toBe(ZOOM_MIN)
    expect(stepZoom(2.2, 'reset')).toBe(1)
  })

  it('snaps an in-between saved value to the next step in the direction pressed', () => {
    expect(stepZoom(0.33, 'out')).toBe(0.3)
    expect(stepZoom(0.33, 'in')).toBe(0.4)
  })

  it('treats a missing or bad value as 1', () => {
    expect(stepZoom(undefined, 'in')).toBe(1.1)
    expect(clampZoom('x')).toBe(1)
    expect(clampZoom(99)).toBe(ZOOM_MAX)
    expect(clampZoom(0.001)).toBe(ZOOM_MIN)
  })

  it('recognises zoom actions', () => {
    expect(isZoomAction('in')).toBe(true)
    expect(isZoomAction('zoom')).toBe(false)
  })
})
