import { describe, it, expect } from 'vitest'
import { applyStickerGeometry, leftOf } from './stickerGeometry'

const fakeNode = () => {
  const inner = { style: {} as Record<string, string>, querySelector: () => glyph }
  const glyph = { style: {} as Record<string, string> }
  const node = { style: {} as Record<string, string>, querySelector: () => inner }
  return { node, inner, glyph }
}

describe('applyStickerGeometry', () => {
  it('positions the same way the rendered sticker does so a live drag lands where the final render will', () => {
    const { node } = fakeNode()
    applyStickerGeometry(node as never, { x: 100, y: 40, size: 80 })
    expect(node.style.left).toBe('100px')
    expect(node.style.top).toBe('40px')
    expect(node.style.width).toBe('80px')
    expect(node.style.height).toBe('80px')
  })

  it('shifts and shrinks the box for a crop, and counter-shifts the image inside it', () => {
    const { node, inner } = fakeNode()
    applyStickerGeometry(node as never, { x: 0, y: 0, size: 100, crop: { l: 0.2, t: 0.1, r: 0, b: 0 } })
    expect(node.style.left).toBe('20px')
    expect(node.style.width).toBe('80px')
    expect(node.style.height).toBe('90px')
    expect(inner.style.left).toBe('-20px')
    expect(inner.style.top).toBe('-10px')
    expect(inner.style.width).toBe('100px')
  })

  it('ignores the crop while the image is being cropped, and rescales emoji text', () => {
    const { node, glyph } = fakeNode()
    applyStickerGeometry(node as never, { x: 5, y: 5, size: 50, crop: { l: 0.5, t: 0, r: 0, b: 0 } }, true, true)
    expect(node.style.width).toBe('50px')
    expect(glyph.style.fontSize).toBe('40px')
  })

  it('adds the crop offset to the position', () => {
    expect(leftOf(12, 3)).toBe('15px')
  })
})
