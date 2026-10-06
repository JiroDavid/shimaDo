import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { SHOTS, shot } from './shot.mjs'

const [outDir, ...rest] = process.argv.slice(2)
if (!outDir) throw new Error('Usage: node scripts/preview/all.mjs <outDir> [--theme id] [--accent value] [--opacity n]')
const flag = (name) => {
  const i = rest.indexOf(`--${name}`)
  return i === -1 ? undefined : rest[i + 1]
}
const flagJson = (name) => (flag(name) === undefined ? undefined : JSON.parse(flag(name)))
mkdirSync(outDir, { recursive: true })
const opacity = flag('opacity')
for (const s of SHOTS) {
  const out = await shot({ ...s, out: join(outDir, `${s.name}.png`), theme: flag('theme'), accent: flag('accent'), opacity: opacity === undefined ? undefined : Number(opacity), design: s.design ?? flagJson('design'), edit: s.edit ?? flagJson('edit') })
  console.log(out)
}
