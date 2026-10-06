import { describe, it, expect } from 'vitest'
import {
  MAX_STICKERS_PER_PANEL, stickerStart, addSticker, deleteSticker, duplicateSticker, sanitizeBackgrounds, sanitizeMoves, sanitizeStickers, setBackground, setMove,
  updateSticker, type Sticker
} from './placement'
import type { AssetInfo } from './assets'

const assets: Record<string, AssetInfo> = { 'asset-aaaa-1': { id: 'asset-aaaa-1', ext: 'png', bytes: 100, name: 'a', addedAt: 1 } }
const emoji = (over: Partial<Sticker> = {}): Sticker => ({ id: 'stk-aaaa-0001', panel: 'checklist', kind: 'emoji', emoji: '😀', x: 10, y: 20, size: 64, layer: 'front', ...over })
const image = (over: Partial<Sticker> = {}): Sticker => ({ id: 'stk-bbbb-0002', panel: 'bar', kind: 'image', asset: 'asset-aaaa-1', x: 5, y: 6, size: 48, layer: 'behind', ...over })

describe('sanitizeMoves', () => {
  it('keeps movable keys, rounds and clamps, and drops zero moves', () => {
    expect(sanitizeMoves({ 'bar.label': { x: 10.4, y: -20.6 }, 'checklist.heading': { x: 99999, y: -99999 }, 'bar.avatar': { x: 0, y: 0 } })).toEqual({
      'bar.label': { x: 10, y: -21 },
      'checklist.heading': { x: 1500, y: -1500 }
    })
  })

  it('drops surfaces, groups, unknown and prototype keys and bad values', () => {
    const raw = JSON.parse('{"checklist.panel":{"x":1,"y":1},"bar.surface":{"x":1,"y":1},"group:button":{"x":1,"y":1},"nope":{"x":1,"y":1},"__proto__":{"x":1,"y":1},"bar.label":{"x":"a","y":1},"bar.exit":5}')
    expect(sanitizeMoves(raw)).toEqual({})
  })

  it.each([null, undefined, 5, 'x', []])('returns empty for %j', (raw) => {
    expect(sanitizeMoves(raw)).toEqual({})
  })
})

describe('sanitizeStickers', () => {
  it('keeps valid emoji and image stickers and clamps numbers', () => {
    expect(sanitizeStickers([emoji({ x: 10.4, size: 9999 }), image()], assets)).toEqual([emoji({ x: 10, size: 600 }), image()])
  })

  it('drops invalid stickers', () => {
    const bad = [
      emoji({ emoji: 'abc' }),
      emoji({ id: 'x' }),
      emoji({ panel: 'nope' as never }),
      emoji({ kind: 'sound' as never }),
      emoji({ layer: 'middle' as never }),
      image({ asset: 'missing-asset-1' }),
      image({ asset: undefined }),
      emoji({ x: Number.NaN }),
      emoji({ id: 'stk-cccc-0003', size: 'big' as never })
    ]
    expect(sanitizeStickers(bad, assets)).toEqual([])
  })

  it('drops duplicate ids and caps each panel', () => {
    const many = Array.from({ length: MAX_STICKERS_PER_PANEL + 5 }, (_, i) => emoji({ id: `stk-many-${String(i).padStart(4, '0')}` }))
    expect(sanitizeStickers(many, assets)).toHaveLength(MAX_STICKERS_PER_PANEL)
    expect(sanitizeStickers([emoji(), emoji()], assets)).toHaveLength(1)
  })

  it.each([null, undefined, 5, 'x', {}])('returns empty for %j', (raw) => {
    expect(sanitizeStickers(raw, assets)).toEqual([])
  })
})

describe('sanitizeBackgrounds', () => {
  it('keeps surface keys with an existing asset and clamps opacity', () => {
    const raw = { 'checklist.panel': { asset: 'asset-aaaa-1', fit: 'cover', opacity: 5 }, 'bar.surface': { asset: 'asset-aaaa-1', fit: 'tile', opacity: 0 }, 'group:panel': { asset: 'asset-aaaa-1', fit: 'contain', opacity: 0.5 } }
    expect(sanitizeBackgrounds(raw, assets)).toEqual({
      'checklist.panel': { asset: 'asset-aaaa-1', fit: 'cover', opacity: 1 },
      'bar.surface': { asset: 'asset-aaaa-1', fit: 'tile', opacity: 0.05 },
      'group:panel': { asset: 'asset-aaaa-1', fit: 'contain', opacity: 0.5 }
    })
  })

  it('drops non-surface keys, missing assets, bad fits and prototype keys', () => {
    const raw = JSON.parse('{"bar.label":{"asset":"asset-aaaa-1","fit":"cover","opacity":1},"checklist.panel":{"asset":"missing-asset-1","fit":"cover","opacity":1},"bar.surface":{"asset":"asset-aaaa-1","fit":"stretch","opacity":1},"__proto__":{"asset":"asset-aaaa-1","fit":"cover","opacity":1}}')
    expect(sanitizeBackgrounds(raw, assets)).toEqual({})
  })
})

describe('setMove', () => {
  it('sets, replaces and removes a move', () => {
    let m = setMove({}, 'bar.label', { x: 10, y: 5 })
    expect(m).toEqual({ 'bar.label': { x: 10, y: 5 } })
    m = setMove(m, 'bar.label', { x: 12, y: 5 })
    expect(m['bar.label']).toEqual({ x: 12, y: 5 })
    expect(setMove(m, 'bar.label', null)).toEqual({})
    expect(setMove(m, 'bar.label', { x: 0, y: 0 })).toEqual({})
  })

  it('returns the same object for invalid keys, invalid values and no-ops', () => {
    const m = { 'bar.label': { x: 10, y: 5 } }
    expect(setMove(m, 'checklist.panel', { x: 1, y: 1 })).toBe(m)
    expect(setMove(m, 'nope', { x: 1, y: 1 })).toBe(m)
    expect(setMove(m, 'bar.label', { x: 'a', y: 1 })).toBe(m)
    expect(setMove(m, 'bar.label', { x: 10, y: 5 })).toBe(m)
    expect(setMove(m, 'bar.exit', null)).toBe(m)
  })
})

describe('sticker functions', () => {
  it('adds a valid sticker with the given id and rejects bad or excess ones', () => {
    const draft = { panel: 'focus', kind: 'emoji', emoji: '🔥', x: 1, y: 2, size: 40, layer: 'front' }
    expect(addSticker([], draft, assets, 'stk-new-0001')).toEqual([{ id: 'stk-new-0001', ...draft }])
    expect(addSticker([], { ...draft, emoji: 'nope' }, assets, 'stk-new-0001')).toBeNull()
    expect(addSticker([], { ...draft, kind: 'image', emoji: undefined, asset: 'missing-asset-1' }, assets, 'stk-new-0001')).toBeNull()
    expect(addSticker([], draft, assets, 'x')).toBeNull()
    const full = Array.from({ length: MAX_STICKERS_PER_PANEL }, (_, i) => emoji({ id: `stk-full-${String(i).padStart(4, '0')}`, panel: 'focus' }))
    expect(addSticker(full, draft, assets, 'stk-new-0001')).toBeNull()
  })

  it('updates position, size and layer with clamping, and returns the same array for no-ops', () => {
    const list = [emoji()]
    expect(updateSticker(list, 'stk-aaaa-0001', { x: 50, size: 9999, layer: 'behind' }, assets)).toEqual([emoji({ x: 50, size: 600, layer: 'behind' })])
    expect(updateSticker(list, 'stk-aaaa-0001', { x: 10 }, assets)).toBe(list)
    expect(updateSticker(list, 'missing', { x: 50 }, assets)).toBe(list)
    expect(updateSticker(list, 'stk-aaaa-0001', { layer: 'middle', x: 'a' }, assets)).toBe(list)
    expect(updateSticker(list, 'stk-aaaa-0001', { emoji: '🔥', asset: 'x', panel: 'bar' }, assets)).toBe(list)
  })

  it('deletes and duplicates', () => {
    const list = [emoji(), image()]
    expect(deleteSticker(list, 'stk-aaaa-0001')).toEqual([image()])
    expect(deleteSticker(list, 'missing')).toBe(list)
    const dup = duplicateSticker(list, 'stk-aaaa-0001', 'stk-dupe-0003')!
    expect(dup).toHaveLength(3)
    expect(dup[2]).toEqual(emoji({ id: 'stk-dupe-0003', x: 34, y: 44 }))
    expect(duplicateSticker(list, 'missing', 'stk-dupe-0003')).toBeNull()
  })
})

describe('setBackground', () => {
  it('sets and clears a background', () => {
    const bg = { asset: 'asset-aaaa-1', fit: 'cover', opacity: 0.8 }
    const set = setBackground({}, 'checklist.panel', bg, assets)
    expect(set).toEqual({ 'checklist.panel': bg })
    expect(setBackground(set, 'checklist.panel', null, assets)).toEqual({})
  })

  it('returns the same object for bad keys, missing assets and no-ops', () => {
    const bg = { asset: 'asset-aaaa-1', fit: 'cover', opacity: 0.8 }
    const set = setBackground({}, 'checklist.panel', bg, assets)
    expect(setBackground(set, 'bar.label', bg, assets)).toBe(set)
    expect(setBackground(set, 'bar.surface', { ...bg, asset: 'missing-asset-1' }, assets)).toBe(set)
    expect(setBackground(set, 'checklist.panel', bg, assets)).toBe(set)
    expect(setBackground(set, 'bar.surface', null, assets)).toBe(set)
  })
})

describe('stickerStart', () => {
  it('staggers new stickers so they do not stack exactly', () => {
    expect(stickerStart(0)).toEqual({ x: 40, y: 90 })
    expect(stickerStart(1)).toEqual({ x: 64, y: 114 })
    const seen = new Set(Array.from({ length: 12 }, (_, i) => JSON.stringify(stickerStart(i))))
    expect(seen.size).toBe(10)
  })
})
