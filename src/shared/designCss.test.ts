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
    expect(designCss({ 'group:card': { radius: 4, background: '#112233' } })).toBe('.card { border-radius: 4px !important }\n.card::before { background: #112233 !important }')
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
    expect(designCss({ 'group:card': { background: '#112233' } })).toBe('.card::before { background: #112233 !important }')
  })

  it('does not flatten checked, active or danger states', () => {
    expect(designCss({ 'group:check': { background: '#112233' } })).toBe(".check:where(:not([aria-checked='true'])) { background: #112233 !important }")
    expect(designCss({ 'group:switch': { background: '#112233' } })).toContain(".switch:where(:not([aria-checked='true']))")
    expect(designCss({ 'group:button': { radius: 4 } })).toBe('.btn:where(:not(.btn-active, .btn-danger)) { border-radius: 4px !important }')
    expect(designCss({ 'group:bar-button': { radius: 4 } })).toBe('.bar-btn { border-radius: 4px !important }')
    expect(designCss({ 'group:task-title': { color: '#112233' } })).toContain(".task-title:where(:not([data-done='true']))")
  })

  it('writes a translate for movable elements', () => {
    expect(designCss({}, { 'bar.label': { x: 10, y: -5 } })).toBe('[data-el="bar.label"] { translate: 10px -5px !important }')
    expect(designCss({ 'bar.label': { color: '#fff' } }, { 'bar.label': { x: 10, y: -5 } })).toBe(
      '[data-el="bar.label"] { color: #fff !important; translate: 10px -5px !important }'
    )
  })

  it('ignores moves for surfaces, groups and unknown keys and clamps the offset', () => {
    expect(designCss({}, { 'checklist.panel': { x: 1, y: 1 }, 'bar.surface': { x: 1, y: 1 }, 'group:button': { x: 1, y: 1 }, nope: { x: 1, y: 1 } })).toBe('')
    expect(designCss({}, { 'bar.label': { x: 99999, y: -99999 } })).toBe('[data-el="bar.label"] { translate: 1500px -1500px !important }')
  })
})
describe('sticker layers', () => {
  it('writes sticker z-indexes in the same stylesheet as the element ones', () => {
    expect(designCss({}, {}, { 'sticker:stk-aaaa-0001': 7 })).toBe('.sticker[data-sticker="stk-aaaa-0001"] { z-index: 7 }')
  })

  it('ignores sticker ids that are not safe to put in a selector', () => {
    expect(designCss({}, {}, { 'sticker:a"] { x: y': 7 })).toBe('')
  })
})

describe('shadow, accent and hide', () => {
  it('scopes a shadow colour and an accent to the element', () => {
    expect(designCss({ 'checklist.card.overdue': { shadow: '#102030' } })).toBe('[data-el="checklist.card.overdue"] { --shadow: #102030 !important }')
    const css = designCss({ 'focus.clock': { accent: '#ff0000' } })
    expect(css).toContain('--accent: #ff0000 !important')
    expect(css).toContain('--accent-rgb: 255 0 0 !important')
    expect(css).toContain('--on-accent:')
  })

  it('hides outside edit mode but only fades while editing so it can still be selected', () => {
    const css = designCss({ 'checklist.date': { hidden: true } })
    expect(css).toContain('html:not([data-edit]) [data-el="checklist.date"] { display: none !important }')
    expect(css).toContain('html[data-edit] [data-el="checklist.date"] { opacity: 0.3 !important }')
  })
})

describe('card heights', () => {
  it('gives a card a real height with a scrolling body instead of a minimum', () => {
    const css = designCss({ 'checklist.card.overdue': { height: 200, width: 300 } })
    expect(css).toContain('[data-el="checklist.card.overdue"] { width: 300px !important; height: 200px !important; min-height: 0 !important; display: flex !important; flex-direction: column !important; box-sizing: border-box !important }')
    expect(css).toContain('[data-el="checklist.card.overdue"] > .card-body { flex: 1 1 auto; min-height: 0; overflow-y: auto }')
  })

  it('keeps a plain element height as a minimum so its text is never clipped', () => {
    expect(designCss({ 'checklist.heading': { height: 80 } })).toContain('min-height: 80px !important')
  })

  it('keeps the add task bar sticky when it is ranked', () => {
    const css = designCss({}, {}, { 'checklist.quick-add': 4 })
    expect(css).toContain('[data-el="checklist.quick-add"] { z-index: 4 }')
    expect(css).not.toContain('position: relative; z-index: 4')
  })
})

describe('card layers', () => {
  it('paints a card fill, border and shadow on its own layer so it can be ranked apart from its content', () => {
    const css = designCss({ 'checklist.card.overdue': { borderColor: '#445566', borderWidth: 3 } }, {}, { 'checklist.card.overdue@bg': 2, 'checklist.card.overdue': 5 })
    expect(css).toContain('[data-el="checklist.card.overdue"]::before { border-color: #445566 !important; border-width: 3px !important; inset: -3px !important; border-style: solid !important; z-index: 2 }')
    expect(css).toContain('[data-el="checklist.card.overdue"] > * { position: relative; z-index: 5 }')
  })

  it('never gives the card element itself a z-index, so its fill and content can interleave with stickers', () => {
    const css = designCss({}, {}, { 'checklist.card.overdue@bg': 2, 'checklist.card.overdue': 5 })
    expect(css).not.toMatch(/\[data-el="checklist\.card\.overdue"\] \{[^}]*z-index/)
  })
})

