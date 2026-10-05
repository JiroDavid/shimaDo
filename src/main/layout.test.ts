import { describe, it, expect } from 'vitest'
import { defaultBounds } from './layout'
import { defaultData } from './store'

const panels = defaultData().settings.panels
const area = { x: 0, y: 0, width: 1920, height: 1040 }

describe('defaultBounds', () => {
  it('puts the bar top-left and the checklist beneath it', () => {
    expect(defaultBounds('bar', area, panels)).toEqual({ x: 16, y: 16, width: 620, height: 60 })
    expect(defaultBounds('checklist', area, panels)).toMatchObject({ x: 16, y: 88 })
  })
  it('stacks progress and nicotine down the right edge without overlap', () => {
    const p = defaultBounds('progress', area, panels)
    const n = defaultBounds('nicotine', area, panels)
    expect(p).toMatchObject({ x: 1524, y: 16 })
    expect(n.x).toBe(1524)
    expect(n.y).toBeGreaterThanOrEqual(p.y + p.height)
  })
  it('places schedule to the right of the checklist and gym to the right of schedule', () => {
    expect(defaultBounds('schedule', area, panels)).toMatchObject({ x: 16 + 380 + 12, y: 88 })
    expect(defaultBounds('gym', area, panels)).toMatchObject({ x: 16 + 380 + 12 + 440 + 12, y: 88 })
  })
  it('centers settings, profile and the exit confirmation', () => {
    expect(defaultBounds('settings', area, panels)).toEqual({ x: 760, y: 250, width: 400, height: 540 })
    expect(defaultBounds('profile', area, panels)).toEqual({ x: 770, y: 280, width: 380, height: 480 })
    expect(defaultBounds('confirm', area, panels)).toEqual({ x: 780, y: 425, width: 360, height: 190 })
  })
  it('respects a work area that does not start at the origin', () => {
    expect(defaultBounds('bar', { x: 1920, y: 40, width: 1920, height: 1000 }, panels)).toMatchObject({ x: 1936, y: 56 })
  })
})
