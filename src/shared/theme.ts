export type ThemeMode = 'dark' | 'light'

export const ACCENT_SLOTS = ['orange', 'brick', 'sage', 'cream'] as const
export type AccentSlot = (typeof ACCENT_SLOTS)[number]

export const THEME_FONTS = ['M PLUS Rounded 1c', 'Barlow Condensed', 'IBM Plex Mono'] as const
export type ThemeFont = (typeof THEME_FONTS)[number]

export interface ThemeColors {
  panel: string
  text: string
  muted: string
  urgent: string
  must: string
  important: string
  danger: string
}

const COLOR_KEYS: (keyof ThemeColors)[] = ['panel', 'text', 'muted', 'urgent', 'must', 'important', 'danger']

export const DERIVED_TOKENS = [
  'line', 'lineStrong', 'dim', 'textSoft', 'overlaySoft', 'overlay', 'overlayStrong', 'card', 'field', 'fieldFocus', 'sheen', 'shadow'
] as const
export type DerivedToken = (typeof DERIVED_TOKENS)[number]

export interface Theme {
  format: 1
  id: string
  name: string
  mode: ThemeMode
  colors: ThemeColors
  overrides?: Partial<Record<DerivedToken, string>>
  accents: Record<AccentSlot, { name: string; value: string }>
  defaultAccent: AccentSlot
  shape: { radiusPanel: number; radiusCard: number; radiusControl: number; borderWidth: number }
  fonts: { body: ThemeFont; heading: ThemeFont }
}

export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const FN = /^rgba?\(\s*(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:\s*(?:,|\/)\s*(\d*\.?\d+))?\s*\)$/i

export function parseColor(value: unknown): Rgba | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  const hex = HEX.exec(v)
  if (hex) {
    let h = hex[1]
    if (h.length === 3) h = [...h].map((c) => c + c).join('')
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 }
  }
  const fn = FN.exec(v)
  if (!fn) return null
  const [r, g, b] = [fn[1], fn[2], fn[3]].map(Number)
  const a = fn[4] === undefined ? 1 : Number(fn[4])
  if (r > 255 || g > 255 || b > 255 || a > 1) return null
  return { r, g, b, a }
}

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0')
const toHex = ({ r, g, b }: Rgba) => `#${hex2(r)}${hex2(g)}${hex2(b)}`
const triplet = ({ r, g, b }: Rgba) => `${r} ${g} ${b}`
const alpha = ({ r, g, b }: Rgba, a: number) => `rgb(${r} ${g} ${b} / ${a})`

const channel = (c: number) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const luminance = ({ r, g, b }: Rgba) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

export function contrastRatio(a: string, b: string): number {
  const ca = parseColor(a)
  const cb = parseColor(b)
  if (!ca || !cb) return 1
  const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export const DARK_INK = '#1a1410'
export const FALLBACK_CUSTOM_ACCENT = '#7b5cff'

export function onAccentFor(accent: string): string {
  return contrastRatio(accent, DARK_INK) >= contrastRatio(accent, '#ffffff') ? DARK_INK : '#ffffff'
}

const HEX_ACCENT = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function normaliseAccentInput(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim().toLowerCase()
  if ((ACCENT_SLOTS as readonly string[]).includes(v)) return v
  const m = HEX_ACCENT.exec(v)
  if (!m) return undefined
  return m[1].length === 3 ? `#${[...m[1]].map((c) => c + c).join('')}` : v
}

export function resolveAccent(theme: Theme, accent: string): string {
  const normal = normaliseAccentInput(accent) ?? theme.defaultAccent
  return normal.startsWith('#') ? normal : theme.accents[normal as AccentSlot].value
}

export function isLowContrast(theme: Theme, accent: string): boolean {
  return contrastRatio(resolveAccent(theme, accent), theme.colors.panel) < 3
}

export interface AccentChoice {
  id: string
  label: string
  checked: boolean
  custom?: boolean
}

export function accentChoices(theme: Theme, accent: string): AccentChoice[] {
  const choices: AccentChoice[] = ACCENT_SLOTS.map((slot) => ({ id: slot, label: theme.accents[slot].name, checked: accent === slot }))
  return accent.startsWith('#') ? [...choices, { id: accent, label: 'Custom', checked: true, custom: true }] : choices
}

const ID = /^[a-z0-9-]{1,32}$/
const NAME = /^[^\u0000-\u001f<>{};]{1,40}$/
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const inRange = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi

export function validateTheme(raw: unknown): Theme | null {
  if (!isObj(raw) || raw.format !== 1) return null
  if (typeof raw.id !== 'string' || !ID.test(raw.id)) return null
  if (typeof raw.name !== 'string' || !NAME.test(raw.name)) return null
  if (raw.mode !== 'dark' && raw.mode !== 'light') return null

  if (!isObj(raw.colors)) return null
  const colors = {} as ThemeColors
  for (const key of COLOR_KEYS) {
    const v = raw.colors[key]
    if (parseColor(v) === null) return null
    colors[key] = (v as string).trim()
  }

  let overrides: Theme['overrides']
  if (raw.overrides !== undefined) {
    if (!isObj(raw.overrides)) return null
    overrides = {}
    for (const [key, v] of Object.entries(raw.overrides)) {
      if (!(DERIVED_TOKENS as readonly string[]).includes(key)) continue
      if (parseColor(v) === null) return null
      overrides[key as DerivedToken] = (v as string).trim()
    }
  }

  if (!isObj(raw.accents)) return null
  const accents = {} as Theme['accents']
  for (const slot of ACCENT_SLOTS) {
    const e = raw.accents[slot]
    if (!isObj(e) || typeof e.name !== 'string' || !NAME.test(e.name) || e.name.length > 24) return null
    const parsed = parseColor(e.value)
    if (!parsed || parsed.a !== 1) return null
    accents[slot] = { name: e.name, value: (e.value as string).trim() }
  }
  if (!(ACCENT_SLOTS as readonly string[]).includes(raw.defaultAccent as string)) return null

  const s = raw.shape
  if (!isObj(s) || !inRange(s.radiusPanel, 0, 40) || !inRange(s.radiusCard, 0, 40) || !inRange(s.radiusControl, 0, 999) || !inRange(s.borderWidth, 0, 4)) return null

  const f = raw.fonts
  if (!isObj(f) || !(THEME_FONTS as readonly string[]).includes(f.body as string) || !(THEME_FONTS as readonly string[]).includes(f.heading as string)) return null

  return {
    format: 1,
    id: raw.id,
    name: raw.name,
    mode: raw.mode,
    colors,
    ...(overrides ? { overrides } : {}),
    accents,
    defaultAccent: raw.defaultAccent as AccentSlot,
    shape: { radiusPanel: s.radiusPanel, radiusCard: s.radiusCard, radiusControl: s.radiusControl, borderWidth: s.borderWidth },
    fonts: { body: f.body as ThemeFont, heading: f.heading as ThemeFont }
  }
}

export function resolveColors(theme: Theme): Record<DerivedToken, string> {
  const text = parseColor(theme.colors.text)!
  const dark = theme.mode === 'dark'
  const derived: Record<DerivedToken, string> = {
    line: alpha(text, 0.14),
    lineStrong: alpha(text, 0.3),
    dim: alpha(text, 0.28),
    textSoft: alpha(text, 0.8),
    overlaySoft: dark ? 'rgb(255 255 255 / 0.04)' : 'rgb(0 0 0 / 0.04)',
    overlay: dark ? 'rgb(255 255 255 / 0.08)' : 'rgb(0 0 0 / 0.08)',
    overlayStrong: dark ? 'rgb(255 255 255 / 0.16)' : 'rgb(0 0 0 / 0.16)',
    card: dark ? 'rgb(255 255 255 / 0.03)' : 'rgb(0 0 0 / 0.03)',
    field: dark ? 'rgb(0 0 0 / 0.28)' : 'rgb(255 255 255 / 0.55)',
    fieldFocus: dark ? 'rgb(0 0 0 / 0.4)' : 'rgb(255 255 255 / 0.8)',
    sheen: dark ? 'rgb(255 255 255 / 0.07)' : 'rgb(255 255 255 / 0.6)',
    shadow: dark ? 'rgb(0 0 0 / 0.3)' : 'rgb(0 0 0 / 0.15)'
  }
  return { ...derived, ...theme.overrides }
}

const FONT_STACKS: Record<ThemeFont, string> = {
  'M PLUS Rounded 1c': "'M PLUS Rounded 1c', system-ui, sans-serif",
  'Barlow Condensed': "'Barlow Condensed', 'M PLUS Rounded 1c', sans-serif",
  'IBM Plex Mono': "'IBM Plex Mono', ui-monospace, monospace"
}

export function themeVars(theme: Theme, accent: string, opacity: number): Record<string, string> {
  const panel = parseColor(theme.colors.panel)!
  const accentValue = resolveAccent(theme, accent)
  const rgb = (c: string) => triplet(parseColor(c)!)
  const d = resolveColors(theme)
  const { colors, shape, fonts } = theme
  return {
    '--panel-rgb': triplet(panel),
    '--panel-solid': toHex(panel),
    '--panel-alpha': String(opacity),
    '--text': colors.text,
    '--text-rgb': rgb(colors.text),
    '--muted': colors.muted,
    '--muted-rgb': rgb(colors.muted),
    '--accent': accentValue,
    '--accent-rgb': rgb(accentValue),
    '--on-accent': onAccentFor(accentValue),
    '--urgent': colors.urgent,
    '--urgent-rgb': rgb(colors.urgent),
    '--must': colors.must,
    '--must-rgb': rgb(colors.must),
    '--important': colors.important,
    '--important-rgb': rgb(colors.important),
    '--danger': colors.danger,
    '--sage': theme.accents.sage.value,
    '--sage-rgb': rgb(theme.accents.sage.value),
    '--line': d.line,
    '--line-strong': d.lineStrong,
    '--dim': d.dim,
    '--text-soft': d.textSoft,
    '--overlay-soft': d.overlaySoft,
    '--overlay': d.overlay,
    '--overlay-strong': d.overlayStrong,
    '--card': d.card,
    '--field': d.field,
    '--field-focus': d.fieldFocus,
    '--sheen': d.sheen,
    '--shadow': d.shadow,
    '--radius-panel': `${shape.radiusPanel}px`,
    '--radius-card': `${shape.radiusCard}px`,
    '--radius-control': `${shape.radiusControl}px`,
    '--border-width': `${shape.borderWidth}px`,
    '--font-body': FONT_STACKS[fonts.body],
    '--font-heading': FONT_STACKS[fonts.heading],
    '--scheme': theme.mode
  }
}
