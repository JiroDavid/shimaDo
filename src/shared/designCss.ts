import { CARD_IDS, ELEMENTS, GROUPS, GROUP_PREFIX, isMovableKey, isSurfaceKey } from './elements'
import type { Move } from './placement'
import type { StyleOverride } from './design'
import { onAccentFor, parseColor } from './theme'

const colour = (v: unknown): string | null => (parseColor(v) ? (v as string).trim() : null)
const px = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : null

function surfaceBackground(value: string): string {
  const c = parseColor(value)!
  return `rgb(${c.r} ${c.g} ${c.b} / calc(var(--panel-alpha) * ${Number(c.a.toFixed(3))}))`
}

function extras(o: StyleOverride): string[] {
  const out: string[] = []
  const shadow = colour(o.shadow)
  if (shadow) out.push(`--shadow: ${shadow} !important`)
  const accent = colour(o.accent)
  if (accent) {
    const c = parseColor(accent)!
    out.push(`--accent: ${accent} !important`, `--accent-rgb: ${c.r} ${c.g} ${c.b} !important`, `--on-accent: ${onAccentFor(accent)} !important`)
  }
  return out
}

function sizeDeclarations(o: StyleOverride, scrolls = false): string[] {
  const out: string[] = []
  const width = px(o.width, 24, 2000)
  const height = px(o.height, 24, 2000)
  if (width !== null) out.push(`width: ${width}px !important`)
  if (height !== null && scrolls) out.push(`height: ${height}px !important`, 'min-height: 0 !important', 'display: flex !important', 'flex-direction: column !important')
  else if (height !== null) out.push(`min-height: ${height}px !important`)
  if (width !== null || height !== null) out.push('box-sizing: border-box !important')
  return out
}

function hideRules(selector: string, o: StyleOverride): string[] {
  if (o.hidden !== true) return []
  return [`html:not([data-edit]) ${selector} { display: none !important }`, `html[data-edit] ${selector} { opacity: 0.3 !important }`]
}

function declarations(o: StyleOverride, surface: boolean): string[] {
  const out: string[] = [...extras(o), ...sizeDeclarations(o)]
  const color = colour(o.color)
  if (color) out.push(`color: ${color} !important`)
  const background = colour(o.background)
  if (background) out.push(`background: ${surface ? surfaceBackground(background) : background} !important`)
  const borderColor = colour(o.borderColor)
  if (borderColor) out.push(`border-color: ${borderColor} !important`)
  const radius = px(o.radius, 0, 999)
  if (radius !== null) out.push(`border-radius: ${radius}px !important`)
  const borderWidth = px(o.borderWidth, 0, 8)
  if (borderWidth !== null) {
    out.push(`border-width: ${borderWidth}px !important`)
    if (borderWidth > 0) out.push('border-style: solid !important')
  }
  const fontSize = px(o.fontSize, 8, 96)
  if (fontSize !== null) out.push(`font-size: ${fontSize}px !important`)
  if (typeof o.bold === 'boolean') out.push(`font-weight: ${o.bold ? 800 : 500} !important`)
  return out
}

const CARD_SET = new Set(CARD_IDS)
const STICKY = new Set(['checklist.quick-add'])
const STICKER_ID = /^[a-z0-9-]{8,40}$/

function cardDeclarations(o: StyleOverride): { host: string[]; surface: string[] } {
  const host: string[] = [...extras(o), ...sizeDeclarations(o, true)]
  const surface: string[] = []
  const color = colour(o.color)
  if (color) host.push(`color: ${color} !important`)
  const background = colour(o.background)
  if (background) surface.push(`background: ${background} !important`)
  const borderColor = colour(o.borderColor)
  if (borderColor) surface.push(`border-color: ${borderColor} !important`)
  const radius = px(o.radius, 0, 999)
  if (radius !== null) host.push(`border-radius: ${radius}px !important`)
  const borderWidth = px(o.borderWidth, 0, 8)
  if (borderWidth !== null) {
    host.push(`border-width: ${borderWidth}px !important`)
    surface.push(`border-width: ${borderWidth}px !important`, `inset: -${borderWidth}px !important`)
    if (borderWidth > 0) host.push('border-style: solid !important')
    if (borderWidth > 0) surface.push('border-style: solid !important')
  }
  const fontSize = px(o.fontSize, 8, 96)
  if (fontSize !== null) host.push(`font-size: ${fontSize}px !important`)
  if (typeof o.bold === 'boolean') host.push(`font-weight: ${o.bold ? 800 : 500} !important`)
  return { host, surface }
}

const zValue = (layers: Record<string, number>, id: string): number | null => {
  if (!Object.prototype.hasOwnProperty.call(layers, id)) return null
  const z = Math.round(layers[id])
  return Number.isFinite(z) ? Math.min(1000, Math.max(1, z)) : null
}

export function designCss(overrides: Record<string, StyleOverride>, moves: Record<string, Move> = {}, layers: Record<string, number> = {}): string {
  const rules: string[] = []
  for (const g of GROUPS) {
    const key = GROUP_PREFIX + g.id
    if (g.id === 'card') {
      const c = cardDeclarations(overrides[key] ?? {})
      if (c.host.length > 0) rules.push(`${g.selector} { ${c.host.join('; ')} }`)
      if (c.surface.length > 0) rules.push(`${g.selector}::before { ${c.surface.join('; ')} }`)
      rules.push(...hideRules(g.selector, overrides[key] ?? {}))
      continue
    }
    const d = declarations(overrides[key] ?? {}, isSurfaceKey(key))
    if (d.length > 0) rules.push(`${g.selector}${g.rest ?? ''} { ${d.join('; ')} }`)
    rules.push(...hideRules(`${g.selector}${g.rest ?? ''}`, overrides[key] ?? {}))
  }
  for (const e of ELEMENTS) {
    const isCard = CARD_SET.has(e.id)
    const card = isCard ? cardDeclarations(overrides[e.id] ?? {}) : null
    const d = card ? card.host : declarations(overrides[e.id] ?? {}, isSurfaceKey(e.id))
    const m = isMovableKey(e.id) && Object.prototype.hasOwnProperty.call(moves, e.id) ? moves[e.id] : undefined
    if (m) {
      const x = Math.min(1500, Math.max(-1500, Math.round(m.x)))
      const y = Math.min(1500, Math.max(-1500, Math.round(m.y)))
      if (Number.isFinite(x) && Number.isFinite(y)) d.push(`translate: ${x}px ${y}px !important`)
    }
    const z = zValue(layers, e.id)
    if (card) {
      const bg = zValue(layers, `${e.id}@bg`)
      const surface = [...card.surface]
      if (bg !== null) surface.push(`z-index: ${bg}`)
      if (surface.length > 0) rules.push(`[data-el="${e.id}"]::before { ${surface.join('; ')} }`)
      if (z !== null) rules.push(`[data-el="${e.id}"] > * { position: relative; z-index: ${z} }`)
      if (overrides[e.id]?.height !== undefined) rules.push(`[data-el="${e.id}"] > .card-body { flex: 1 1 auto; min-height: 0; overflow-y: auto }`)
    } else if (z !== null && isMovableKey(e.id)) d.push(STICKY.has(e.id) ? `z-index: ${z}` : `position: relative; z-index: ${z}`)
    if (d.length > 0) rules.push(`[data-el="${e.id}"] { ${d.join('; ')} }`)
    rules.push(...hideRules(`[data-el="${e.id}"]`, overrides[e.id] ?? {}))
  }
  for (const key of Object.keys(layers)) {
    const id = key.startsWith('sticker:') ? key.slice('sticker:'.length) : null
    const z = zValue(layers, key)
    if (id !== null && z !== null && STICKER_ID.test(id)) rules.push(`.sticker[data-sticker="${id}"] { z-index: ${z} }`)
  }
  return rules.join('\n')
}
