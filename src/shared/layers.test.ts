import { describe, it, expect } from 'vitest'
import { arrange, effectiveOrder, isLayered, layerZ, raiseSticker, sanitizeOrder, panelElementIds, stepLayer, stepSticker } from './layers'
import { emptyDesign, type Design } from './design'
import { designCss } from './designCss'
import type { Sticker } from './placement'

const stk = (id: string, over: Partial<Sticker> = {}): Sticker => ({ id, panel: 'checklist', kind: 'emoji', emoji: '😀', x: 0, y: 0, size: 50, layer: 'front', ...over })
const design = (stickers: Sticker[] = [], order: Design['order'] = {}): Design => ({ ...emptyDesign(), stickers, order })
const els = panelElementIds('checklist')
const cardKey = 'checklist.card.overdue'

describe('effectiveOrder', () => {
  it('lists elements first, then front stickers on top', () => {
    const d = design([stk('stk-aaaa-0001'), stk('stk-bbbb-0002', { layer: 'behind' })])
    expect(effectiveOrder(d, 'checklist')).toEqual([...els, 'sticker:stk-aaaa-0001'])
  })

  it('respects a stored order and appends anything new', () => {
    const d = design([stk('stk-aaaa-0001')], { checklist: ['sticker:stk-aaaa-0001', els[1]] })
    const order = effectiveOrder(d, 'checklist')
    expect(order.slice(-2)).toEqual(['sticker:stk-aaaa-0001', els[1]])
    expect(order).toHaveLength(els.length + 1)
  })
})

describe('layerZ and isLayered', () => {
  it('assigns increasing z from 1 only for layered windows', () => {
    expect(isLayered(design(), 'checklist')).toBe(false)
    expect(layerZ(design(), 'checklist')).toEqual({})
    const d = design([stk('stk-aaaa-0001')])
    const z = layerZ(d, 'checklist')
    expect(z[els[0]]).toBe(1)
    expect(z['sticker:stk-aaaa-0001']).toBe(els.length + 1)
  })
})

describe('arrange', () => {
  const base = design([stk('stk-aaaa-0001')])

  it('puts a sticker directly in front of an element', () => {
    const next = arrange(base, 'checklist', 'sticker:stk-aaaa-0001', 'front', els[0])
    expect(effectiveOrder(next, 'checklist').slice(0, 2)).toEqual([els[0], 'sticker:stk-aaaa-0001'])
  })

  it('moves an element above a sticker', () => {
    const next = arrange(base, 'checklist', els[0], 'front', 'sticker:stk-aaaa-0001')
    const order = effectiveOrder(next, 'checklist')
    expect(order[order.length - 1]).toBe(els[0])
  })

  it('sends a sticker behind content or the panel, and drops it from the order', () => {
    const placed = arrange(base, 'checklist', 'sticker:stk-aaaa-0001', 'front', els[0])
    const behind = arrange(placed, 'checklist', 'sticker:stk-aaaa-0001', 'behind', null)
    expect(behind.stickers[0].layer).toBe('behind')
    expect(behind.order.checklist ?? []).not.toContain('sticker:stk-aaaa-0001')
    expect(arrange(behind, 'checklist', 'sticker:stk-aaaa-0001', 'under', null).stickers[0].layer).toBe('under')
  })

  it('brings a sticker back to the front region', () => {
    const behind = design([stk('stk-aaaa-0001', { layer: 'behind' })])
    const next = arrange(behind, 'checklist', 'sticker:stk-aaaa-0001', 'front', els[0])
    expect(next.stickers[0].layer).toBe('front')
  })

  it('refuses to put elements behind content and ignores unknown ids', () => {
    expect(arrange(base, 'checklist', els[0], 'behind', null)).toBe(base)
    expect(arrange(base, 'checklist', 'nope', 'front', null)).toBe(base)
    expect(arrange(base, 'checklist', 'sticker:stk-zzzz-9999', 'front', null)).toBe(base)
    expect(arrange(base, 'gym', 'sticker:stk-aaaa-0001', 'front', null)).toBe(base)
  })
})

describe('sanitizeOrder', () => {
  it('keeps known ids for the right window and drops the rest', () => {
    const stickers = [stk('stk-aaaa-0001'), stk('stk-bbbb-0002', { layer: 'behind' })]
    const out = sanitizeOrder({ checklist: [els[0], els[0], 'sticker:stk-aaaa-0001', 'sticker:stk-bbbb-0002', 'gym.heading', 5], nope: ['x'] }, stickers)
    expect(out).toEqual({ checklist: [els[0], 'sticker:stk-aaaa-0001'] })
  })
})

describe('card background layers', () => {
  it('lists a card background just below the card content', () => {
    expect(els.indexOf(`${cardKey}@bg`)).toBe(els.indexOf(cardKey) - 1)
  })

  it('lets a sticker sit between a card background and its content', () => {
    const base = design([stk('stk-aaaa-0001')])
    const next = arrange(base, 'checklist', 'sticker:stk-aaaa-0001', 'front', `${cardKey}@bg`)
    const order = effectiveOrder(next, 'checklist')
    expect(order.indexOf('sticker:stk-aaaa-0001')).toBe(order.indexOf(`${cardKey}@bg`) + 1)
    expect(order.indexOf(cardKey)).toBeGreaterThan(order.indexOf('sticker:stk-aaaa-0001'))
  })

  it('accepts background layers only for cards', () => {
    expect(sanitizeOrder({ checklist: [`${cardKey}@bg`, 'checklist.title@bg'] }, [])).toEqual({ checklist: [`${cardKey}@bg`] })
  })
})

describe('designCss layers', () => {
  it('gives listed elements a position and z-index', () => {
    const css = designCss({}, {}, { [els[0]]: 3 })
    expect(css).toContain(`[data-el="${els[0]}"] { position: relative; z-index: 3 }`)
  })
})

describe('stepSticker', () => {
  const two = () => design([stk('stk-aaaa-0001'), stk('stk-bbbb-0002')])

  it('moves a front sticker one place at a time past elements and other stickers', () => {
    const base = design([stk('stk-aaaa-0001')])
    const order = effectiveOrder(base, 'checklist')
    expect(order[order.length - 1]).toBe('sticker:stk-aaaa-0001')
    const down = stepSticker(base, 'checklist', 'stk-aaaa-0001', 'back')
    const after = effectiveOrder(down, 'checklist')
    expect(after.indexOf('sticker:stk-aaaa-0001')).toBe(order.length - 2)
    const up = stepSticker(down, 'checklist', 'stk-aaaa-0001', 'forward')
    expect(effectiveOrder(up, 'checklist')).toEqual(order)
  })

  it('does nothing at the very front, and crosses behind the content from the lowest front place', () => {
    const base = design([stk('stk-aaaa-0001')])
    expect(stepSticker(base, 'checklist', 'stk-aaaa-0001', 'forward')).toBe(base)
    let d = base
    for (let i = 0; i < els.length; i++) d = stepSticker(d, 'checklist', 'stk-aaaa-0001', 'back')
    expect(d.stickers[0].layer).toBe('front')
    d = stepSticker(d, 'checklist', 'stk-aaaa-0001', 'back')
    expect(d.stickers[0].layer).toBe('behind')
  })

  it('steps behind stickers among themselves and then across the boundaries', () => {
    const base = design([stk('stk-aaaa-0001', { layer: 'behind' }), stk('stk-bbbb-0002', { layer: 'behind' })])
    const swapped = stepSticker(base, 'checklist', 'stk-aaaa-0001', 'forward')
    expect(swapped.stickers.map((s) => s.id)).toEqual(['stk-bbbb-0002', 'stk-aaaa-0001'])
    expect(stepSticker(swapped, 'checklist', 'stk-aaaa-0001', 'forward').stickers.find((s) => s.id === 'stk-aaaa-0001')!.layer).toBe('front')
    expect(stepSticker(base, 'checklist', 'stk-aaaa-0001', 'back').stickers.find((s) => s.id === 'stk-aaaa-0001')!.layer).toBe('under')
  })

  it('orders desktop images by their position in the list', () => {
    const d = design([stk('stk-aaaa-0001', { panel: 'free' }), stk('stk-bbbb-0002', { panel: 'free' })])
    expect(stepSticker(d, 'free', 'stk-aaaa-0001', 'forward').stickers.map((s) => s.id)).toEqual(['stk-bbbb-0002', 'stk-aaaa-0001'])
    expect(stepSticker(d, 'free', 'stk-bbbb-0002', 'forward')).toBe(d)
    expect(stepSticker(d, 'free', 'stk-aaaa-0001', 'back')).toBe(d)
  })

  it('raises a sticker to the top of its own group and ignores the rest', () => {
    expect(raiseSticker(two(), 'stk-aaaa-0001').stickers.map((s) => s.id)).toEqual(['stk-bbbb-0002', 'stk-aaaa-0001'])
    const d = two()
    expect(raiseSticker(d, 'stk-bbbb-0002')).toBe(d)
    expect(raiseSticker(d, 'nope')).toBe(d)
  })
})

describe('stepLayer', () => {
  it('swaps an element with its neighbour in the layer order and stops at the ends', () => {
    const d = design()
    const dom = ['checklist.title', 'checklist.heading', 'checklist.date']
    const up = stepLayer(d, 'checklist', 'checklist.heading', 'forward', dom)
    expect(effectiveOrder(up, 'checklist', dom)).toEqual(['checklist.title', 'checklist.date', 'checklist.heading'])
    expect(stepLayer(up, 'checklist', 'checklist.heading', 'forward', dom)).toBe(up)
    expect(stepLayer(d, 'checklist', 'checklist.title', 'back', dom)).toBe(d)
    expect(stepLayer(d, 'checklist', 'nope', 'forward', dom)).toBe(d)
  })
})
