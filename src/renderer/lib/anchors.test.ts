import { describe, it, expect } from 'vitest'
import { anchorFor, pickAnchorElement, resolveAnchor } from './anchors'

const card = { id: 'checklist.card.overdue', box: { left: 10, top: 100, width: 300, height: 200 } }
const row = { id: 'checklist.heading', box: { left: 20, top: 120, width: 120, height: 30 } }

describe('anchors', () => {
  it('anchors to the smallest element under the image centre', () => {
    expect(pickAnchorElement({ x: 50, y: 130 }, [card, row])?.id).toBe('checklist.heading')
    expect(pickAnchorElement({ x: 250, y: 250 }, [card, row])?.id).toBe('checklist.card.overdue')
    expect(pickAnchorElement({ x: 5, y: 5 }, [card, row])).toBeNull()
  })

  it('stores the offset from the element corner and resolves it after the element moves', () => {
    const anchor = anchorFor({ x: 200, y: 180, size: 40 }, [card, row])!
    expect(anchor).toEqual({ el: 'checklist.card.overdue', x: 190, y: 80 })
    expect(resolveAnchor(anchor, { 'checklist.card.overdue': { left: 10, top: 400, width: 300, height: 200 } })).toEqual({ x: 200, y: 480 })
  })

  it('uses the cropped image centre when picking the element', () => {
    const a = anchorFor({ x: 0, y: 100, size: 100, crop: { l: 0.5, t: 0, r: 0, b: 0 } }, [card])
    expect(a?.el).toBe('checklist.card.overdue')
  })

  it('returns nothing when the element is missing or hidden', () => {
    expect(resolveAnchor({ el: 'checklist.card.done', x: 1, y: 1 }, {})).toBeNull()
    expect(anchorFor({ x: 0, y: 0, size: 10 }, [])).toBeNull()
  })
})
