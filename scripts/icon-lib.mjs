import { deflateSync, crc32 } from 'node:zlib'

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const DARK = hex('#14120f')
const CREAM = hex('#F3E9D6')
const ORANGE = hex('#F2541B')

export const ICON_SIZES = [16, 24, 32, 48, 64, 128, 256]

export function renderIcon(size, supersample = 6) {
  const ring = Math.max(0.045, 1.6 / size)
  const sun = size <= 32 ? 0.28 : 0.25
  const out = new Uint8Array(size * size * 4)
  const samples = supersample * supersample
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let covered = 0
      for (let sy = 0; sy < supersample; sy++) {
        for (let sx = 0; sx < supersample; sx++) {
          const u = (x + (sx + 0.5) / supersample) / size - 0.5
          const v = (y + (sy + 0.5) / supersample) / size - 0.5
          const d = Math.hypot(u, v)
          let c = null
          if (d <= 0.48) c = DARK
          if (d >= 0.34 && d < 0.34 + ring) c = CREAM
          if (d < sun) c = ORANGE
          if (c) {
            r += c[0]
            g += c[1]
            b += c[2]
            covered++
          }
        }
      }
      const i = (y * size + x) * 4
      if (covered > 0) {
        out[i] = Math.round(r / covered)
        out[i + 1] = Math.round(g / covered)
        out[i + 2] = Math.round(b / covered)
        out[i + 3] = Math.round((covered / samples) * 255)
      }
    }
  }
  return out
}

const chunk = (type, data) => {
  const t = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0)
  return Buffer.concat([len, t, data, crc])
}

export function encodePng(size, rgba) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * size * 4, size * 4).copy(raw, y * stride + 1)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
}

export function buildIco(entries) {
  const header = Buffer.alloc(6 + entries.length * 16)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)
  let offset = header.length
  entries.forEach((e, i) => {
    const at = 6 + i * 16
    header[at] = e.size >= 256 ? 0 : e.size
    header[at + 1] = e.size >= 256 ? 0 : e.size
    header.writeUInt16LE(1, at + 4)
    header.writeUInt16LE(32, at + 6)
    header.writeUInt32LE(e.png.length, at + 8)
    header.writeUInt32LE(offset, at + 12)
    offset += e.png.length
  })
  return Buffer.concat([header, ...entries.map((e) => e.png)])
}
