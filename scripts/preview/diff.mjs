import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

function decode(path) {
  const buf = readFileSync(path)
  let pos = 8
  let width = 0
  let height = 0
  let depth = 0
  let type = 0
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const name = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (name === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      depth = data[8]
      type = data[9]
    }
    if (name === 'IDAT') idat.push(data)
    pos += 12 + len
  }
  if (depth !== 8 || (type !== 2 && type !== 6)) throw new Error(`Unsupported PNG in ${path}`)
  const bpp = type === 6 ? 4 : 3
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * bpp
  const out = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0
      const b = y > 0 ? out[(y - 1) * stride + x] : 0
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0
      let v = row[x]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      out[y * stride + x] = v & 255
    }
  }
  return { width, height, bpp, data: out }
}

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : Number(args[i + 1])
}
const [fileA, fileB] = args.filter((a) => a.endsWith('.png'))
const tolerance = flag('tolerance', 8)
const max = flag('max', 1)
const a = decode(fileA)
const b = decode(fileB)
if (a.width !== b.width || a.height !== b.height) {
  console.log(`size differs: ${a.width}x${a.height} vs ${b.width}x${b.height}`)
  process.exit(1)
}
let differing = 0
for (let y = 0; y < a.height; y++) {
  for (let x = 0; x < a.width; x++) {
    let worst = 0
    for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(a.data[(y * a.width + x) * a.bpp + c] - b.data[(y * b.width + x) * b.bpp + c]))
    if (worst > tolerance) differing++
  }
}
const pct = (differing / (a.width * a.height)) * 100
console.log(`${pct.toFixed(2)}% of pixels differ (tolerance ${tolerance}) - ${fileA} vs ${fileB}`)
process.exit(pct > max ? 1 : 0)
