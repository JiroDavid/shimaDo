import { describe, it, expect } from 'vitest'
import { defaultBounds, effectiveSize, MIN_SIZES, scaledPanels } from './layout'
import { defaultData } from './store'

const panels = defaultData().settings.panels
const area = { x: 0, y: 0, width: 1920, height: 1040 }

describe('defaultBounds', () => {
  it('puts the bar top-left and the checklist beneath it', () => {
    expect(defaultBounds('bar', area, panels)).toEqual({ x: 16, y: 16, width: 600, height: 50 })
    expect(defaultBounds('checklist', area, panels)).toMatchObject({ x: 16, y: 78 })
  })
  it('stacks progress and habits down the right edge without overlap', () => {
    const p = defaultBounds('progress', area, panels)
    const n = defaultBounds('habits', area, panels)
    expect(p).toMatchObject({ x: 1604, y: 16 })
    expect(n.x).toBe(1604)
    expect(n.y).toBeGreaterThanOrEqual(p.y + p.height)
  })
  it('puts the notepad under the focus timer without overlap', () => {
    const f = defaultBounds('focus', area, panels)
    const n = defaultBounds('notepad', area, panels)
    expect(n.x + n.width).toBe(f.x + f.width)
    expect(n.y).toBeGreaterThanOrEqual(f.y + f.height)
  })
  it('places schedule to the right of the checklist and gym to the right of schedule', () => {
    expect(defaultBounds('schedule', area, panels)).toMatchObject({ x: 16 + 300 + 12, y: 78 })
    expect(defaultBounds('gym', area, panels)).toMatchObject({ x: 16 + 300 + 12 + 350 + 12, y: 78 })
  })
  it('centers settings, profile and the exit confirmation', () => {
    expect(defaultBounds('settings', area, panels)).toEqual({ x: 795, y: 295, width: 330, height: 450 })
    expect(defaultBounds('profile', area, panels)).toEqual({ x: 803, y: 320, width: 315, height: 400 })
    expect(defaultBounds('confirm', area, panels)).toEqual({ x: 800, y: 425, width: 320, height: 190 })
  })
  it('centers the welcome panel', () => {
    const w = defaultBounds('welcome', area, panels)
    expect(w.x + w.width / 2).toBeCloseTo(area.x + area.width / 2, 0)
    expect(w.y + w.height / 2).toBeCloseTo(area.y + area.height / 2, 0)
  })
  it('puts the designer on the right edge at the top', () => {
    const d = defaultBounds('designer', area, panels)
    expect(d.x + d.width).toBe(area.x + area.width - 16)
    expect(d.y).toBe(16)
  })
  it('puts the minimised icon where the bar starts', () => {
    expect(defaultBounds('mini', area, panels)).toEqual({ x: 16, y: 16, width: 64, height: 64 })
  })
  it('respects a work area that does not start at the origin', () => {
    expect(defaultBounds('bar', { x: 1920, y: 40, width: 1920, height: 1000 }, panels)).toMatchObject({ x: 1936, y: 56 })
  })
})

describe('effectiveSize', () => {
  it('keeps a saved bar size but never lets it go below the bar minimum', () => {
    expect(effectiveSize('bar', { width: 900, height: 80 }, panels)).toEqual({ width: 900, height: 80 })
    expect(effectiveSize('bar', { width: 50, height: 10 }, panels)).toEqual(MIN_SIZES.bar)
  })
  it('keeps the minimised icon a fixed size', () => {
    expect(effectiveSize('mini', { width: 300, height: 300 }, panels)).toEqual({ width: 64, height: 64 })
  })
  it('raises other panels to their minimum and leaves bigger ones alone', () => {
    expect(effectiveSize('settings', { width: 100, height: 100 }, panels)).toEqual({ width: MIN_SIZES.settings.width, height: MIN_SIZES.settings.height })
    expect(effectiveSize('progress', { width: 700, height: 900 }, panels)).toEqual({ width: 700, height: 900 })
  })
  it('scales the bar, the icon and the minimum sizes with the text size', () => {
    expect(effectiveSize('bar', { width: 1, height: 1 }, panels, 1.2)).toEqual({
      width: Math.round(MIN_SIZES.bar.width * 1.2),
      height: Math.round(MIN_SIZES.bar.height * 1.2)
    })
    expect(effectiveSize('mini', { width: 1, height: 1 }, panels, 1.5)).toEqual({ width: 96, height: 96 })
    expect(effectiveSize('settings', { width: 1, height: 1 }, panels, 1.5)).toEqual({ width: MIN_SIZES.settings.width * 1.5, height: MIN_SIZES.settings.height * 1.5 })
    expect(effectiveSize('progress', { width: 700, height: 900 }, panels, 1.4)).toEqual({ width: 700, height: 900 })
  })
  it('scales a whole set of panel sizes', () => {
    const scaled = scaledPanels(panels, 1.2)
    expect(scaled.checklist.width).toBe(360)
    expect(scaled.checklist.height).toBe(528)
    expect(scaled.checklist.visible).toBe(panels.checklist.visible)
  })
  it('lets the bar shrink to a slim strip', () => {
    expect(MIN_SIZES.bar.width).toBeLessThanOrEqual(340)
    expect(MIN_SIZES.bar.height).toBeLessThanOrEqual(36)
  })
  it('lets the data panels shrink well below their default size', () => {
    expect(MIN_SIZES.progress.width).toBeLessThanOrEqual(220)
    expect(MIN_SIZES.habits.height).toBeLessThanOrEqual(200)
  })
})
