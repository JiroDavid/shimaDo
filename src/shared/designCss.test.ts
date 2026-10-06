import { describe, it, expect } from 'vitest'
import { designCss } from './designCss'

describe('designCss', () => {
  it('is empty with no overrides', () => {
    expect(designCss({})).toBe('')
  })

  it('writes an element rule with every declaration important', () => {
    expect(designCss({ 'checklist.heading': { color: '#ff0000', fontSize: 30, bold: true } })).toBe(
      '[data-el="checklist.heading"] { color: #ff0000 !important; font-size: 30px !important; font-weight: 800 !important }'
    )
  })

  it('writes a group rule using the group selector', () => {
    expect(designCss({ 'group:card': { radius: 4, background: '#112233' } })).toBe('.card { background: #112233 !important; border-radius: 4px !important }')
  })

  it('maps bold off to a normal weight and adds a border style only for a positive width', () => {
    expect(designCss({ 'bar.label': { bold: false } })).toContain('font-weight: 500 !important')
    expect(designCss({ 'bar.surface': { borderWidth: 0 } })).toBe('[data-el="bar.surface"] { border-width: 0px !important }')
    expect(designCss({ 'bar.surface': { borderWidth: 3, borderColor: '#fff' } })).toBe(
      '[data-el="bar.surface"] { border-color: #fff !important; border-width: 3px !important; border-style: solid !important }'
    )
  })

  it('emits groups before elements and button before button-primary', () => {
    const css = designCss({
      'bar.exit': { color: '#111111' },
      'group:button-primary': { color: '#222222' },
      'group:button': { color: '#333333' }
    })
    const at = (s: string) => css.indexOf(s)
    expect(at('.btn:where(')).toBeGreaterThanOrEqual(0)
    expect(at('.btn:where(')).toBeLessThan(at('.btn-primary {'))
    expect(at('.btn-primary {')).toBeLessThan(at('[data-el="bar.exit"]'))
  })

  it('ignores keys that are not in the registry so nothing can reach a selector', () => {
    expect(designCss({ 'x"] { } *{': { color: '#fff' }, 'group:nope': { color: '#fff' }, __proto__: { color: '#fff' } } as never)).toBe('')
  })

  it('drops invalid values instead of emitting them', () => {
    expect(designCss({ 'bar.label': { color: 'url(x)', radius: Number.NaN } as never })).toBe('')
    expect(designCss({ 'bar.label': { color: 'red; } * { display: none' } as never })).toBe('')
  })

  it('clamps numbers into their ranges', () => {
    expect(designCss({ 'bar.label': { fontSize: 5000, radius: -4 } as never })).toBe(
      '[data-el="bar.label"] { border-radius: 0px !important; font-size: 96px !important }'
    )
  })

  it('keeps panel opacity working when a window surface background changes', () => {
    expect(designCss({ 'group:panel': { background: '#112233' } })).toBe('.panel { background: rgb(17 34 51 / calc(var(--panel-alpha) * 1)) !important }')
    expect(designCss({ 'bar.surface': { background: 'rgb(1 2 3 / 0.5)' } })).toBe('[data-el="bar.surface"] { background: rgb(1 2 3 / calc(var(--panel-alpha) * 0.5)) !important }')
    expect(designCss({ 'checklist.panel': { background: '#000000' } })).toContain('var(--panel-alpha)')
  })

  it('leaves other backgrounds as plain colours', () => {
    expect(designCss({ 'group:card': { background: '#112233' } })).toBe('.card { background: #112233 !important }')
  })

  it('does not flatten checked, active or danger states', () => {
    expect(designCss({ 'group:check': { background: '#112233' } })).toBe(".check:where(:not([aria-checked='true'])) { background: #112233 !important }")
    expect(designCss({ 'group:switch': { background: '#112233' } })).toContain(".switch:where(:not([aria-checked='true']))")
    expect(designCss({ 'group:button': { radius: 4 } })).toBe('.btn:where(:not(.btn-active, .btn-danger)) { border-radius: 4px !important }')
    expect(designCss({ 'group:bar-button': { radius: 4 } })).toBe('.bar-btn { border-radius: 4px !important }')
    expect(designCss({ 'group:task-title': { color: '#112233' } })).toContain(".task-title:where(:not([data-done='true']))")
  })
})
