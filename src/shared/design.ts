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
}

export interface Design {
  overrides: Record<string, StyleOverride>
}

export const emptyDesign = (): Design => ({ overrides: {} })

export const MAX_TEXT = 60
const TEXT_OK = /^[^\u0000-\u001f<>{};]+$/
const FIELDS = ['color', 'background', 'borderColor', 'radius', 'borderWidth', 'fontSize', 'bold', 'text'] as const
const RANGES: Record<'radius' | 'borderWidth' | 'fontSize', [number, number]> = { radius: [0, 999], borderWidth: [0, 8], fontSize: [8, 96] }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function checkField(field: string, value: unknown): string | number | boolean | undefined {
  if (field === 'color' || field === 'background' || field === 'borderColor') return parseColor(value) ? (value as string).trim() : undefined
  if (field === 'radius' || field === 'borderWidth' || field === 'fontSize') {
    const [lo, hi] = RANGES[field]
    return typeof value === 'number' && Number.isFinite(value) && value >= lo && value <= hi ? Math.round(value) : undefined
  }
  if (field === 'bold') return typeof value === 'boolean' ? value : undefined
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

export function sanitizeDesign(raw: unknown): Design {
  const overrides: Record<string, StyleOverride> = {}
  const src = isObj(raw) ? raw.overrides : undefined
  if (isObj(src)) {
    for (const [key, value] of Object.entries(src)) {
      if (!isKnownKey(key)) continue
      const o = sanitizeOverride(value)
      if (Object.keys(o).length > 0) overrides[key] = o
    }
  }
  return { overrides }
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

export function setOverride(design: Design, key: string, patch: unknown): Design {
  if (!isKnownKey(key)) return design
  const next = applyPatch(design.overrides[key] ?? {}, patch)
  const overrides = { ...design.overrides }
  if (Object.keys(next).length === 0) delete overrides[key]
  else overrides[key] = next
  return { overrides }
}

export function clearOverride(design: Design, key: string): Design {
  if (!Object.prototype.hasOwnProperty.call(design.overrides, key)) return design
  const overrides = { ...design.overrides }
  delete overrides[key]
  return { overrides }
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
  panel: PanelId
  computed: ComputedSnapshot
}

const clampNum = (v: unknown, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(0, Math.round(v))) : 0)
const cssColor = (v: unknown) => (typeof v === 'string' && parseColor(v) ? v : '')

export function parseSelection(raw: unknown): SelectedElement | null {
  if (!isObj(raw) || typeof raw.id !== 'string' || !isKnownKey(raw.id)) return null
  if (typeof raw.panel !== 'string' || !(PANEL_IDS as string[]).includes(raw.panel)) return null
  const c = raw.computed
  if (!isObj(c)) return null
  return {
    id: raw.id,
    panel: raw.panel as PanelId,
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

export function paletteFor(theme: Theme, accent: string): string[] {
  const { panel, text, muted, urgent, must, important } = theme.colors
  const slots = Object.values(theme.accents).map((a) => a.value)
  const all = [panel, text, muted, resolveAccent(theme, accent), ...slots, urgent, must, important]
  return [...new Set(all.map((c) => colorToHex(c)).filter((c): c is string => c !== null))]
}
