import { describe, it, expect } from 'vitest'
import {
  applyPatch, clearOverride, emptyDesign, paletteFor, parseSelection, resolveOverride, sanitizeDesign, sanitizeOverride, setOverride, type Design
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
    expect(sanitizeDesign(raw)).toEqual({ overrides: { 'bar.label': { text: 'Hi' }, 'group:button': { radius: 4 } } })
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
    const d: Design = { overrides: { 'group:bar-button': { radius: 4, color: '#ff0000' }, 'bar.exit': { color: '#0000ff' } } }
    expect(resolveOverride(d, 'bar.exit')).toEqual({ radius: 4, color: '#0000ff' })
  })

  it('uses only the element when it has no group', () => {
    const d: Design = { overrides: { 'bar.label': { color: '#0000ff' } } }
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
