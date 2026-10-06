import { describe, it, expect } from 'vitest'
import {
  applyPatch, clearElement, clearOverride, emptyDesign, labelBoxValue, paletteFor, parseSelection, resolveOverride, removeAssetUsers, sanitizeDesign, sanitizeOverride, setOverride, type Design
} from './design'
import { themeById } from './themes'

describe('sanitizeOverride', () => {
  it('keeps valid values and normalises them', () => {
    expect(sanitizeOverride({ color: '#fff', background: 'rgb(1 2 3 / 0.5)', borderColor: ' #112233 ', radius: 12.4, borderWidth: 2, fontSize: 20, bold: true, text: ' Hello ' })).toEqual({
      color: '#fff', background: 'rgb(1 2 3 / 0.5)', borderColor: '#112233', radius: 12, borderWidth: 2, fontSize: 20, bold: true, text: 'Hello'
    })
  })

  it('drops invalid values but keeps the valid ones', () => {
    expect(sanitizeOverride({ color: 'url(x)', background: '#000', radius: 5000, borderWidth: -1, fontSize: 'big', bold: 'yes', text: '<b>' })).toEqual({ background: '#000' })
  })

  it.each(['', '   ', 'a;b', 'a{b', 'a}b', 'a<b', 'x'.repeat(61), 'tab\there'])('rejects text %j', (text) => {
    expect(sanitizeOverride({ text })).toEqual({})
  })

  it('accepts text of exactly 60 characters', () => {
    expect(sanitizeOverride({ text: 'x'.repeat(60) })).toEqual({ text: 'x'.repeat(60) })
  })

  it.each([null, undefined, 5, 'x', [], true])('returns empty for non-object %j', (v) => {
    expect(sanitizeOverride(v)).toEqual({})
  })
})

describe('sanitizeDesign', () => {
  it('drops unknown keys, prototype keys and empty overrides', () => {
    const raw = JSON.parse('{"overrides":{"__proto__":{"color":"#fff"},"nope":{"color":"#fff"},"group:nope":{"color":"#fff"},"bar.label":{"text":"Hi"},"group:button":{"radius":4},"bar.avatar":{}}}')
    expect(sanitizeDesign(raw)).toEqual({ ...emptyDesign(), overrides: { 'bar.label': { text: 'Hi' }, 'group:button': { radius: 4 } } })
    expect(({} as Record<string, unknown>).color).toBeUndefined()
  })

  it.each([null, undefined, 5, 'x', [], { overrides: 5 }, { overrides: [] }])('returns an empty design for %j', (raw) => {
    expect(sanitizeDesign(raw)).toEqual(emptyDesign())
  })
})

describe('patching', () => {
  it('sets, merges and clears properties', () => {
    let d: Design = emptyDesign()
    d = setOverride(d, 'bar.label', { color: '#ff0000' })
    d = setOverride(d, 'bar.label', { fontSize: 30 })
    expect(d.overrides['bar.label']).toEqual({ color: '#ff0000', fontSize: 30 })
    d = setOverride(d, 'bar.label', { color: null })
    expect(d.overrides['bar.label']).toEqual({ fontSize: 30 })
    d = setOverride(d, 'bar.label', { fontSize: null })
    expect(d.overrides).toEqual({})
  })

  it('ignores invalid patch values and unknown keys', () => {
    const d = setOverride(emptyDesign(), 'bar.label', { color: '#ff0000' })
    expect(setOverride(d, 'bar.label', { color: 'url(x)', radius: 5000 }).overrides['bar.label']).toEqual({ color: '#ff0000' })
    expect(setOverride(d, 'nope', { color: '#fff' })).toBe(d)
    expect(setOverride(d, '__proto__', { color: '#fff' })).toBe(d)
  })

  it('applyPatch returns the same override for a non-object patch', () => {
    const o = { color: '#fff' }
    expect(applyPatch(o, null)).toBe(o)
    expect(applyPatch(o, 5)).toBe(o)
    expect(applyPatch(o, [])).toBe(o)
  })

  it('clears one override', () => {
    const d = setOverride(setOverride(emptyDesign(), 'bar.label', { color: '#fff' }), 'group:button', { radius: 4 })
    expect(clearOverride(d, 'bar.label').overrides).toEqual({ 'group:button': { radius: 4 } })
    expect(clearOverride(d, 'nope')).toBe(d)
    expect(clearOverride(d, 'constructor')).toBe(d)
  })
})

describe('resolveOverride', () => {
  it('layers the element over its group', () => {
    const d: Design = { ...emptyDesign(), overrides: { 'group:bar-button': { radius: 4, color: '#ff0000' }, 'bar.exit': { color: '#0000ff' } } }
    expect(resolveOverride(d, 'bar.exit')).toEqual({ radius: 4, color: '#0000ff' })
  })

  it('uses only the element when it has no group', () => {
    const d: Design = { ...emptyDesign(), overrides: { 'bar.label': { color: '#0000ff' } } }
    expect(resolveOverride(d, 'bar.label')).toEqual({ color: '#0000ff' })
    expect(resolveOverride(d, 'nope')).toEqual({})
  })
})

describe('parseSelection', () => {
  const computed = { color: 'rgb(243, 233, 214)', background: 'rgba(0, 0, 0, 0)', borderColor: 'rgb(1, 2, 3)', radius: 12, borderWidth: 2, fontSize: 16, bold: false }

  it('accepts an element and a group selection', () => {
    expect(parseSelection({ id: 'bar.label', panel: 'bar', computed })).toEqual({ id: 'bar.label', panel: 'bar', computed })
    expect(parseSelection({ id: 'group:button', panel: 'checklist', computed })?.id).toBe('group:button')
  })

  it('rejects unknown ids, bad panels and non-objects', () => {
    expect(parseSelection({ id: 'nope', panel: 'bar', computed })).toBeNull()
    expect(parseSelection({ id: 'bar.label', panel: 'nope', computed })).toBeNull()
    expect(parseSelection({ id: 'bar.label', panel: 'bar' })).toBeNull()
    for (const raw of [null, undefined, 5, 'x', []]) expect(parseSelection(raw)).toBeNull()
  })

  it('cleans up the computed snapshot', () => {
    const sel = parseSelection({ id: 'bar.label', panel: 'bar', computed: { ...computed, color: 'nope', radius: 5000, fontSize: Number.NaN, bold: 'x' } })
    expect(sel?.computed).toMatchObject({ color: '', radius: 999, fontSize: 0, bold: false })
  })
})

describe('paletteFor', () => {
  it('lists unique lowercase hex colours from the theme and accent', () => {
    const p = paletteFor(themeById('classic'), 'orange')
    expect(new Set(p).size).toBe(p.length)
    for (const c of p) expect(c).toMatch(/^#[0-9a-f]{6}$/)
    expect(p).toContain('#f2541b')
    expect(p).toContain('#181612')
  })

  it('includes a custom accent', () => {
    expect(paletteFor(themeById('paper'), '#abcdef')).toContain('#abcdef')
  })
})

describe('no-op patches', () => {
  it('returns the same design when a patch changes nothing', () => {
    const d = setOverride(emptyDesign(), 'bar.label', { color: '#ff0000', text: 'Hi' })
    expect(setOverride(d, 'bar.label', { text: 'a;b' })).toBe(d)
    expect(setOverride(d, 'bar.label', { color: '#ff0000' })).toBe(d)
    expect(setOverride(d, 'bar.label', { radius: 5000 })).toBe(d)
    expect(setOverride(d, 'bar.label', {})).toBe(d)
  })

  it('returns the same design when clearing a field that is not set', () => {
    const empty = emptyDesign()
    expect(setOverride(empty, 'bar.label', { color: null })).toBe(empty)
    const d = setOverride(empty, 'bar.label', { color: '#ff0000' })
    expect(setOverride(d, 'bar.label', { fontSize: null })).toBe(d)
  })

  it('still changes the design when a patch really changes something', () => {
    const d = setOverride(emptyDesign(), 'bar.label', { color: '#ff0000' })
    expect(setOverride(d, 'bar.label', { color: '#00ff00' })).not.toBe(d)
    expect(setOverride(d, 'bar.label', { color: null }).overrides).toEqual({})
  })
})

describe('labelBoxValue', () => {
  it('keeps what the user typed while the box is focused, including spaces and blanks', () => {
    expect(labelBoxValue('My ', 'My', 'Things to do today', true)).toBe('My ')
    expect(labelBoxValue('', undefined, 'Things to do today', true)).toBe('')
  })

  it('shows the stored label when the box is not focused', () => {
    expect(labelBoxValue('old', 'Mine', 'Things to do today', false)).toBe('Mine')
  })

  it('falls back to the default label, then to empty', () => {
    expect(labelBoxValue('old', undefined, 'Things to do today', false)).toBe('Things to do today')
    expect(labelBoxValue('old', undefined, undefined, false)).toBe('')
  })
})

describe('design placement fields', () => {
  const assets = { 'asset-aaaa-1': { id: 'asset-aaaa-1', ext: 'png' as const, bytes: 5, name: 'a', addedAt: 1 } }
  const sticker = { id: 'stk-aaaa-0001', panel: 'bar', kind: 'image', asset: 'asset-aaaa-1', x: 1, y: 2, size: 40, layer: 'front' }

  it('starts empty in every field', () => {
    expect(emptyDesign()).toEqual({ overrides: {}, moves: {}, stickers: [], backgrounds: {} })
  })

  it('sanitises moves, stickers and backgrounds with the asset index', () => {
    const raw = {
      overrides: {},
      moves: { 'bar.label': { x: 5, y: 6 }, 'checklist.panel': { x: 1, y: 1 } },
      stickers: [sticker, { ...sticker, id: 'stk-bbbb-0002', asset: 'gone-asset-1' }],
      backgrounds: { 'bar.surface': { asset: 'asset-aaaa-1', fit: 'cover', opacity: 1 }, 'bar.label': { asset: 'asset-aaaa-1', fit: 'cover', opacity: 1 } }
    }
    const d = sanitizeDesign(raw, assets)
    expect(d.moves).toEqual({ 'bar.label': { x: 5, y: 6 } })
    expect(d.stickers).toEqual([sticker])
    expect(Object.keys(d.backgrounds)).toEqual(['bar.surface'])
    expect(sanitizeDesign(raw).stickers).toEqual([])
  })

  it('keeps moves, stickers and backgrounds when an override changes', () => {
    const base = { ...emptyDesign(), moves: { 'bar.label': { x: 1, y: 1 } } }
    const next = setOverride(base, 'bar.label', { color: '#fff' })
    expect(next.moves).toEqual(base.moves)
    expect(clearOverride(next, 'bar.label').moves).toEqual(base.moves)
  })

  it('clears an element override and move together', () => {
    const d = { ...emptyDesign(), overrides: { 'bar.label': { color: '#fff' } }, moves: { 'bar.label': { x: 1, y: 1 }, 'bar.exit': { x: 2, y: 2 } } }
    const next = clearElement(d, 'bar.label')
    expect(next.overrides).toEqual({})
    expect(next.moves).toEqual({ 'bar.exit': { x: 2, y: 2 } })
    expect(clearElement(d, 'nope')).toBe(d)
  })

  it('removes stickers and backgrounds that use a deleted asset', () => {
    const d = sanitizeDesign({ overrides: {}, moves: {}, stickers: [sticker], backgrounds: { 'bar.surface': { asset: 'asset-aaaa-1', fit: 'cover', opacity: 1 } } }, assets)
    const next = removeAssetUsers(d, 'asset-aaaa-1')
    expect(next.stickers).toEqual([])
    expect(next.backgrounds).toEqual({})
    expect(removeAssetUsers(d, 'other-asset-1')).toBe(d)
  })

  it('accepts a sticker selection only for a sticker that exists', () => {
    const computed = { color: '', background: '', borderColor: '', radius: 0, borderWidth: 0, fontSize: 0, bold: false }
    expect(parseSelection({ id: 'sticker:stk-aaaa-0001', panel: 'bar', computed }, [sticker as never])?.id).toBe('sticker:stk-aaaa-0001')
    expect(parseSelection({ id: 'sticker:stk-aaaa-0001', panel: 'bar', computed }, [])).toBeNull()
    expect(parseSelection({ id: 'sticker:stk-aaaa-0001', panel: 'bar', computed })).toBeNull()
  })
})
