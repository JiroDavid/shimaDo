import { describe, it, expect } from 'vitest'
import { defaultBounds } from './layout'
import { defaultData } from './store'

const panels = defaultData().settings.panels
const area = { x: 0, y: 0, width: 1920, height: 1040 }

describe('defaultBounds', () => {
  it('puts the bar top-left and the checklist beneath it', () => {
    expect(defaultBounds('bar', area, panels)).toEqual({ x: 16, y: 16, width: 480, height: 44 })
    expect(defaultBounds('checklist', area, panels)).toMatchObject({ x: 16, y: 72 })
  })
  it('stacks progress and nicotine down the right edge without overlap', () => {
    const p = defaultBounds('progress', area, panels)
    const n = defaultBounds('nicotine', area, panels)
    expect(p).toMatchObject({ x: 1564, y: 16 })
    expect(n.x).toBe(1564)
    expect(n.y).toBeGreaterThanOrEqual(p.y + p.height)
  })
  it('places schedule to the right of the checklist and gym to the right of schedule', () => {
    expect(defaultBounds('schedule', area, panels)).toMatchObject({ x: 16 + 340 + 12, y: 72 })
    expect(defaultBounds('gym', area, panels)).toMatchObject({ x: 16 + 340 + 12 + 380 + 12, y: 72 })
  })
  it('centers settings and profile', () => {
    expect(defaultBounds('settings', area, panels)).toEqual({ x: 790, y: 340, width: 340, height: 360 })
    expect(defaultBounds('profile', area, panels)).toEqual({ x: 790, y: 300, width: 340, height: 440 })
  })
  it('respects a work area that does not start at the origin', () => {
    expect(defaultBounds('bar', { x: 1920, y: 40, width: 1920, height: 1000 }, panels)).toMatchObject({ x: 1936, y: 56 })
  })
})
