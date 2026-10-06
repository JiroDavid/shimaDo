import { describe, it, expect } from 'vitest'
import { DRAG_THRESHOLD, dragOffset, dropPosition, elementScale, exceedsThreshold, nudgeDelta, stickerPosition, stickerResize } from './dragMove'

describe('exceedsThreshold', () => {
  it('starts a drag only after a few pixels of movement', () => {
    expect(exceedsThreshold(0, 0)).toBe(false)
    expect(exceedsThreshold(DRAG_THRESHOLD - 1, 0)).toBe(false)
    expect(exceedsThreshold(3, 3)).toBe(true)
    expect(exceedsThreshold(0, -DRAG_THRESHOLD)).toBe(true)
  })
})

describe('dragOffset', () => {
  it('adds the pointer movement in the element own units', () => {
    expect(dragOffset({ x: 10, y: -4 }, { dx: 20, dy: 30 }, 1)).toEqual({ x: 30, y: 26 })
  })

  it('divides by the on-screen scale so the element follows the pointer when content is zoomed', () => {
    expect(dragOffset({ x: 0, y: 0 }, { dx: 40, dy: 20 }, 0.5)).toEqual({ x: 80, y: 40 })
    expect(dragOffset({ x: 0, y: 0 }, { dx: 40, dy: 20 }, 2)).toEqual({ x: 20, y: 10 })
  })

  it('rounds and clamps to the allowed range, and survives a bad scale', () => {
    expect(dragOffset({ x: 1490, y: -1490 }, { dx: 100, dy: -100 }, 1)).toEqual({ x: 1500, y: -1500 })
    expect(dragOffset({ x: 0, y: 0 }, { dx: 10, dy: 10 }, 0)).toEqual({ x: 10, y: 10 })
    expect(dragOffset({ x: 0, y: 0 }, { dx: 10, dy: 10 }, Number.NaN)).toEqual({ x: 10, y: 10 })
    expect(dragOffset({ x: 0, y: 0 }, { dx: 1.4, dy: 1.6 }, 1)).toEqual({ x: 1, y: 2 })
  })
})

describe('elementScale', () => {
  it('measures the on-screen scale and falls back to 1', () => {
    expect(elementScale(50, 100)).toBe(0.5)
    expect(elementScale(100, 100)).toBe(1)
    expect(elementScale(10, 0)).toBe(1)
    expect(elementScale(0, 100)).toBe(1)
    expect(elementScale(Number.NaN, 100)).toBe(1)
  })
})

describe('sticker drag and resize', () => {
  it('moves and clamps a sticker', () => {
    expect(stickerPosition({ x: 10, y: 10 }, { dx: 5, dy: -5 })).toEqual({ x: 15, y: 5 })
    expect(stickerPosition({ x: 3990, y: -190 }, { dx: 100, dy: -100 })).toEqual({ x: 4000, y: -200 })
  })

  it('resizes from the corner handle and clamps', () => {
    expect(stickerResize(64, { dx: 10, dy: 20 })).toBe(79)
    expect(stickerResize(64, { dx: -500, dy: -500 })).toBe(16)
    expect(stickerResize(500, { dx: 500, dy: 500 })).toBe(600)
  })
})

describe('nudgeDelta', () => {
  it('maps arrow keys to one pixel, or ten with shift', () => {
    expect(nudgeDelta('ArrowLeft', false)).toEqual({ x: -1, y: 0 })
    expect(nudgeDelta('ArrowRight', true)).toEqual({ x: 10, y: 0 })
    expect(nudgeDelta('ArrowUp', false)).toEqual({ x: 0, y: -1 })
    expect(nudgeDelta('ArrowDown', true)).toEqual({ x: 0, y: 10 })
    expect(nudgeDelta('a', false)).toBeNull()
  })
})

describe('sticker drag and resize inside a zoomed container', () => {
  it('divides pointer movement by the container scale so the sticker follows the pointer', () => {
    expect(stickerPosition({ x: 10, y: 10 }, { dx: 20, dy: -10 }, 2)).toEqual({ x: 20, y: 5 })
    expect(stickerPosition({ x: 10, y: 10 }, { dx: 20, dy: -10 }, 0.5)).toEqual({ x: 50, y: -10 })
    expect(stickerResize(64, { dx: 20, dy: 20 }, 2)).toBe(74)
    expect(stickerResize(64, { dx: 20, dy: 20 }, 0.5)).toBe(104)
  })

  it('treats a missing or bad scale as 1', () => {
    expect(stickerPosition({ x: 10, y: 10 }, { dx: 5, dy: 5 }, 0)).toEqual({ x: 15, y: 15 })
    expect(stickerResize(64, { dx: 10, dy: 10 }, Number.NaN)).toBe(74)
  })
})

describe('dropPosition', () => {
  it('centres a dropped sticker on the pointer in the container own units', () => {
    expect(dropPosition({ x: 150, y: 120 }, { left: 50, top: 20 }, 96, 1)).toEqual({ x: 52, y: 52 })
    expect(dropPosition({ x: 150, y: 120 }, { left: 50, top: 20 }, 96, 2)).toEqual({ x: 2, y: 2 })
    expect(dropPosition({ x: 150, y: 120 }, { left: 50, top: 20 }, 96, 0)).toEqual({ x: 52, y: 52 })
  })

  it('offsets later files so they do not stack', () => {
    expect(dropPosition({ x: 150, y: 120 }, { left: 50, top: 20 }, 96, 1, 2)).toEqual({ x: 92, y: 92 })
  })
})
