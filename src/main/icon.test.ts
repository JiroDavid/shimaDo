import { describe, it, expect } from 'vitest'
import { buildIco, encodePng, ICON_SIZES, renderIcon } from '../../scripts/icon-lib.mjs'

describe('app icon', () => {
  it('has smooth anti-aliased edges at every size', () => {
    for (const n of ICON_SIZES) {
      const px = renderIcon(n)
      let partial = 0
      for (let i = 3; i < px.length; i += 4) if (px[i] > 0 && px[i] < 255) partial++
      expect(partial).toBeGreaterThan(n / 2)
    }
  })
  it('is transparent in the corners and the accent orange at the centre', () => {
    const n = 64
    const px = renderIcon(n)
    expect(px[3]).toBe(0)
    const c = (Math.floor(n / 2) * n + Math.floor(n / 2)) * 4
    expect([px[c], px[c + 1], px[c + 2], px[c + 3]]).toEqual([242, 84, 27, 255])
  })
  it('packs one PNG per size into the ico', () => {
    const entries = ICON_SIZES.map((size) => ({ size, png: encodePng(size, renderIcon(size)) }))
    const ico = Buffer.from(buildIco(entries))
    expect(ico.readUInt16LE(2)).toBe(1)
    expect(ico.readUInt16LE(4)).toBe(ICON_SIZES.length)
    ICON_SIZES.forEach((size, i) => {
      const entry = 6 + i * 16
      expect(ico[entry]).toBe(size === 256 ? 0 : size)
      const offset = ico.readUInt32LE(entry + 12)
      expect(ico.subarray(offset + 1, offset + 4).toString()).toBe('PNG')
    })
  })
})
