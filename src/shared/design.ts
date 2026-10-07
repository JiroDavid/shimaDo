import type { AssetInfo } from './assets'
import { sanitizeOrder } from './layers'
import { sanitizePresets, sanitizeRecent, type WindowPreset } from './presets'
import { FREE_PANEL, sanitizeBackgrounds, sanitizeMoves, sanitizeStickers, type Background, type Move, type Sticker } from './placement'
import { PANEL_IDS, type PanelId } from './types'
import { GROUP_PREFIX, elementById, isKnownKey } from './elements'
import { colorToHex, parseColor, resolveAccent, type Theme } from './theme'

export interface StyleOverride {
  color?: string
  background?: string
  borderColor?: string
  radius?: number
  borderWidth?: number
  fontSize?: number
  bold?: boolean
  text?: string
  shadow?: string
  accent?: string
  hidden?: boolean
  width?: number
  height?: number
}

export interface Design {
  overrides: Record<string, StyleOverride>
  moves: Record<string, Move>
  stickers: Sticker[]
  backgrounds: Record<string, Background>
  order: Record<string, string[]>
  recentColors: string[]
  presets: WindowPreset[]
}

export const emptyDesign = (): Design => ({ overrides: {}, moves: {}, stickers: [], backgrounds: {}, order: {}, recentColors: [], presets: [] })

export const COLOR_INPUT_FALLBACK = '#000000'
export const MAX_TEXT = 60
const TEXT_OK = /^[^\u0000-\u001f<>{};]+$/
const FIELDS = ['color', 'background', 'borderColor', 'radius', 'borderWidth', 'fontSize', 'bold', 'text', 'shadow', 'accent', 'hidden', 'width', 'height'] as const
const RANGES: Record<'radius' | 'borderWidth' | 'fontSize' | 'width' | 'height', [number, number]> = { radius: [0, 999], borderWidth: [0, 8], fontSize: [8, 96], width: [24, 2000], height: [24, 2000] }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function checkField(field: string, value: unknown): string | number | boolean | undefined {
  if (field === 'color' || field === 'background' || field === 'borderColor' || field === 'shadow' || field === 'accent') return parseColor(value) ? (value as string).trim() : undefined
  if (field === 'radius' || field === 'borderWidth' || field === 'fontSize' || field === 'width' || field === 'height') {
    const [lo, hi] = RANGES[field]
    return typeof value === 'number' && Number.isFinite(value) && value >= lo && value <= hi ? Math.round(value) : undefined
  }
  if (field === 'bold' || field === 'hidden') return typeof value === 'boolean' ? value : undefined
  if (field === 'text') {
    if (typeof value !== 'string') return undefined
    const t = value.trim()
    return t.length >= 1 && t.length <= MAX_TEXT && TEXT_OK.test(t) ? t : undefined
  }
  return undefined
}

export function sanitizeOverride(raw: unknown): StyleOverride {
  const out: Record<string, unknown> = {}
  if (!isObj(raw)) return out
  for (const f of FIELDS) {
    const v = checkField(f, raw[f])
    if (v !== undefined) out[f] = v
  }
  return out as StyleOverride
}

export function sanitizeDesign(raw: unknown, assets: Record<string, AssetInfo> = {}): Design {
  const overrides: Record<string, StyleOverride> = {}
  const whole = isObj(raw) ? raw : {}
  const src = whole.overrides
  if (isObj(src)) {
    for (const [key, value] of Object.entries(src)) {
      if (!isKnownKey(key)) continue
      const o = sanitizeOverride(value)
      if (Object.keys(o).length > 0) overrides[key] = o
    }
  }
  const stickers = sanitizeStickers(whole.stickers, assets)
  return {
    overrides,
    moves: sanitizeMoves(whole.moves),
    stickers,
    backgrounds: sanitizeBackgrounds(whole.backgrounds, assets),
    order: sanitizeOrder(whole.order, stickers),
    recentColors: sanitizeRecent(whole.recentColors),
    presets: sanitizePresets(whole.presets)
  }
}

export function applyPatch(current: StyleOverride, patch: unknown): StyleOverride {
  if (!isObj(patch)) return current
  const next: Record<string, unknown> = { ...current }
  for (const f of FIELDS) {
    if (!(f in patch)) continue
    const raw = patch[f]
    if (raw === null) {
      delete next[f]
      continue
    }
    const v = checkField(f, raw)
    if (v !== undefined) next[f] = v
  }
  return next as StyleOverride
}

function sameOverride(a: StyleOverride, b: StyleOverride): boolean {
  const ak = Object.keys(a) as (keyof StyleOverride)[]
  return ak.length === Object.keys(b).length && ak.every((k) => a[k] === b[k])
}

export function setOverride(design: Design, key: string, patch: unknown): Design {
  if (!isKnownKey(key)) return design
  const existing = design.overrides[key] ?? {}
  const next = applyPatch(existing, patch)
  if (sameOverride(existing, next)) return design
  const overrides = { ...design.overrides }
  if (Object.keys(next).length === 0) delete overrides[key]
  else overrides[key] = next
  return { ...design, overrides }
}

export function clearOverride(design: Design, key: string): Design {
  if (!Object.prototype.hasOwnProperty.call(design.overrides, key)) return design
  const overrides = { ...design.overrides }
  delete overrides[key]
  return { ...design, overrides }
}

export function clearElement(design: Design, key: string): Design {
  const has = (o: object) => Object.prototype.hasOwnProperty.call(o, key)
  if (!has(design.overrides) && !has(design.moves)) return design
  const overrides = { ...design.overrides }
  const moves = { ...design.moves }
  delete overrides[key]
  delete moves[key]
  return { ...design, overrides, moves }
}

export function removeAssetUsers(design: Design, assetId: string): Design {
  const stickers = design.stickers.filter((s) => s.asset !== assetId)
  const entries = Object.entries(design.backgrounds).filter(([, bg]) => bg.asset !== assetId)
  if (stickers.length === design.stickers.length && entries.length === Object.keys(design.backgrounds).length) return design
  return { ...design, stickers, backgrounds: Object.fromEntries(entries), order: sanitizeOrder(design.order, stickers) }
}

export function labelBoxValue(typed: string, stored: string | undefined, defaultText: string | undefined, focused: boolean): string {
  return focused ? typed : (stored ?? defaultText ?? '')
}

export function resolveOverride(design: Design, id: string): StyleOverride {
  const def = elementById(id)
  const group = def?.group ? design.overrides[GROUP_PREFIX + def.group] : undefined
  return { ...group, ...design.overrides[id] }
}

export interface ComputedSnapshot {
  color: string
  background: string
  borderColor: string
  radius: number
  borderWidth: number
  fontSize: number
  bold: boolean
}

export interface SelectedElement {
  id: string
  panel: PanelId | typeof FREE_PANEL
  computed: ComputedSnapshot
}

const clampNum = (v: unknown, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(0, Math.round(v))) : 0)
const cssColor = (v: unknown) => (typeof v === 'string' && parseColor(v) ? v : '')

export function parseSelection(raw: unknown, stickers: Sticker[] = []): SelectedElement | null {
  if (!isObj(raw) || typeof raw.id !== 'string') return null
  const known = isKnownKey(raw.id) || (raw.id.startsWith('sticker:') && stickers.some((s) => `sticker:${s.id}` === raw.id))
  if (!known) return null
  if (typeof raw.panel !== 'string' || !((PANEL_IDS as string[]).includes(raw.panel) || raw.panel === FREE_PANEL)) return null
  const c = raw.computed
  if (!isObj(c)) return null
  return {
    id: raw.id,
    panel: raw.panel as PanelId | typeof FREE_PANEL,
    computed: {
      color: cssColor(c.color),
      background: cssColor(c.background),
      borderColor: cssColor(c.borderColor),
      radius: clampNum(c.radius, 999),
      borderWidth: clampNum(c.borderWidth, 8),
      fontSize: clampNum(c.fontSize, 96),
      bold: c.bold === true
    }
  }
}

export const MAX_SELECTION = 50

export function parseSelections(raw: unknown, stickers: Sticker[] = []): SelectedElement[] {
  const list = Array.isArray(raw) ? raw : raw === null || raw === undefined ? [] : [raw]
  const out: SelectedElement[] = []
  for (const item of list) {
    const s = parseSelection(item, stickers)
    if (!s || out.some((o) => o.id === s.id) || (out.length > 0 && out[0].panel !== s.panel)) continue
    out.push(s)
    if (out.length >= MAX_SELECTION) break
  }
  return out
}

export function paletteFor(theme: Theme, accent: string): string[] {
  const { panel, text, muted, urgent, must, important } = theme.colors
  const slots = Object.values(theme.accents).map((a) => a.value)
  const all = [panel, text, muted, resolveAccent(theme, accent), ...slots, urgent, must, important]
  return [...new Set(all.map((c) => colorToHex(c)).filter((c): c is string => c !== null))]
}
