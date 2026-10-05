import { describe, it, expect } from 'vitest'
import { defaultBounds, effectiveSize, MIN_SIZES } from './layout'
import { defaultData } from './store'

const panels = defaultData().settings.panels
const area = { x: 0, y: 0, width: 1920, height: 1040 }

describe('defaultBounds', () => {
  it('puts the bar top-left and the checklist beneath it', () => {
    expect(defaultBounds('bar', area, panels)).toEqual({ x: 16, y: 16, width: 640, height: 56 })
    expect(defaultBounds('checklist', area, panels)).toMatchObject({ x: 16, y: 84 })
  })
  it('stacks progress and nicotine down the right edge without overlap', () => {
    const p = defaultBounds('progress', area, panels)
    const n = defaultBounds('nicotine', area, panels)
    expect(p).toMatchObject({ x: 1564, y: 16 })
    expect(n.x).toBe(1564)
    expect(n.y).toBeGreaterThanOrEqual(p.y + p.height)
  })
  it('places schedule to the right of the checklist and gym to the right of schedule', () => {
    expect(defaultBounds('schedule', area, panels)).toMatchObject({ x: 16 + 340 + 12, y: 84 })
    expect(defaultBounds('gym', area, panels)).toMatchObject({ x: 16 + 340 + 12 + 400 + 12, y: 84 })
  })
  it('centers settings, profile and the exit confirmation', () => {
    expect(defaultBounds('settings', area, panels)).toEqual({ x: 770, y: 260, width: 380, height: 520 })
    expect(defaultBounds('profile', area, panels)).toEqual({ x: 780, y: 290, width: 360, height: 460 })
    expect(defaultBounds('confirm', area, panels)).toEqual({ x: 780, y: 415, width: 360, height: 210 })
  })
  it('respects a work area that does not start at the origin', () => {
    expect(defaultBounds('bar', { x: 1920, y: 40, width: 1920, height: 1000 }, panels)).toMatchObject({ x: 1936, y: 56 })
  })
})

describe('effectiveSize', () => {
  it('always uses the default size for the bar, even when old data saved a smaller one', () => {
    expect(effectiveSize('bar', { width: 480, height: 44 }, panels)).toEqual({ width: 640, height: 56 })
  })
  it('raises other panels to their minimum and leaves bigger ones alone', () => {
    expect(effectiveSize('settings', { width: 300, height: 300 }, panels)).toEqual({ width: MIN_SIZES.settings.width, height: MIN_SIZES.settings.height })
    expect(effectiveSize('progress', { width: 700, height: 900 }, panels)).toEqual({ width: 700, height: 900 })
  })
})
