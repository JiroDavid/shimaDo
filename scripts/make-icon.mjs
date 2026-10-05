import { deflateSync, crc32 } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const N = 256
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const DARK = hex('#0d0c09')
const BRICK = hex('#B83A2D')
const CREAM = hex('#DCC9A9')

const px = Buffer.alloc(N * N * 4)
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const r = Math.hypot(x - N / 2 + 0.5, y - N / 2 + 0.5)
    let c = null
    if (r <= 120) c = DARK
    if (r < 68) c = BRICK
    else if (r >= 84 && r < 92) c = CREAM
    if (c) px.set([c[0], c[1], c[2], 255], (y * N + x) * 4)
  }
}

const stride = N * 4 + 1
const raw = Buffer.alloc(stride * N)
for (let y = 0; y < N; y++) px.copy(raw, y * stride + 1, y * N * 4, (y + 1) * N * 4)

const chunk = (type, data) => {
  const t = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0)
  return Buffer.concat([len, t, data, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(N, 0)
ihdr.writeUInt32BE(N, 4)
ihdr[8] = 8
ihdr[9] = 6

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0))
])

mkdirSync('resources', { recursive: true })
writeFileSync('resources/icon.png', png)
