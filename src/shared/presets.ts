import { elementById, CARD_IDS } from './elements'
import { applyPatch, type Design, type StyleOverride } from './design'
import { isStickerPanel } from './placement'
import { parseColor } from './theme'

export interface WindowPreset {
  id: string
  name: string
  roles: Record<string, StyleOverride>
}

export const MAX_PRESETS = 20
export const MAX_RECENT = 10
export const PRESET_FIELDS = ['color', 'background', 'borderColor', 'shadow', 'accent'] as const
const NAME_OK = /^[^\u0000-\u001f<>{};]{1,24}$/
const PRESET_ID = /^[a-z0-9-]{8,40}$/

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function roleOf(key: string, panel: string): string | null {
  if (!key.startsWith(`${panel}.`)) return null
  const rest = key.slice(panel.length + 1)
  return rest.startsWith('card.') ? 'card' : rest
}

function colours(o: StyleOverride): StyleOverride {
  const out: Record<string, unknown> = {}
  for (const f of PRESET_FIELDS) if (o[f] !== undefined) out[f] = o[f]
  return out as StyleOverride
}

export function captureRoles(design: Design, panel: string): Record<string, StyleOverride> {
  const roles: Record<string, StyleOverride> = {}
  for (const [key, o] of Object.entries(design.overrides)) {
    if (elementById(key)?.panel !== panel) continue
    const role = roleOf(key, panel)
    const c = colours(o)
    if (!role || Object.keys(c).length === 0) continue
    roles[role] = { ...roles[role], ...c }
  }
  return roles
}

export function targetKeys(role: string, panel: string): string[] {
  if (role === 'card') return CARD_IDS.filter((id) => elementById(id)?.panel === panel)
  const key = `${panel}.${role}`
  return elementById(key) ? [key] : []
}

export function sanitizeRecent(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const v of raw) {
    const c = typeof v === 'string' ? parseColor(v) : null
    if (!c || c.a !== 1 || typeof v !== 'string') continue
    const hex = v.trim().toLowerCase()
    if (/^#[0-9a-f]{6}$/.test(hex) && !out.includes(hex)) out.push(hex)
  }
  return out.slice(-MAX_RECENT)
}

export function addRecent(list: string[], value: unknown): string[] {
  const [hex] = sanitizeRecent([value])
  if (!hex) return list
  const next = [...list.filter((c) => c !== hex), hex]
  return next.slice(-MAX_RECENT)
}

export function sanitizePresets(raw: unknown): WindowPreset[] {
  if (!Array.isArray(raw)) return []
  const out: WindowPreset[] = []
  for (const item of raw) {
    if (!isObj(item) || typeof item.id !== 'string' || !PRESET_ID.test(item.id) || typeof item.name !== 'string' || !NAME_OK.test(item.name.trim())) continue
    if (out.some((p) => p.id === item.id) || !isObj(item.roles)) continue
    const roles: Record<string, StyleOverride> = {}
    for (const [role, o] of Object.entries(item.roles)) {
      if (!/^[a-z0-9.-]{1,40}$/.test(role)) continue
      const c = colours(applyPatch({}, o))
      if (Object.keys(c).length > 0) roles[role] = c
    }
    out.push({ id: item.id, name: item.name.trim(), roles })
    if (out.length >= MAX_PRESETS) break
  }
  return out
}

export function savePreset(design: Design, panel: string, name: unknown, id: string): Design | null {
  const label = typeof name === 'string' ? name.trim() : ''
  if (!isStickerPanel(panel) || !NAME_OK.test(label) || !PRESET_ID.test(id)) return null
  const roles = captureRoles(design, panel)
  if (Object.keys(roles).length === 0) return null
  const rest = design.presets.filter((p) => p.name.toLowerCase() !== label.toLowerCase())
  if (rest.length >= MAX_PRESETS) return null
  return { ...design, presets: [...rest, { id, name: label, roles }] }
}

export function deletePreset(design: Design, id: string): Design {
  return design.presets.some((p) => p.id === id) ? { ...design, presets: design.presets.filter((p) => p.id !== id) } : design
}

export function applyPreset(design: Design, id: string, panel: string): Design {
  const preset = design.presets.find((p) => p.id === id)
  if (!preset || !isStickerPanel(panel)) return design
  const overrides = { ...design.overrides }
  let changed = false
  for (const [role, o] of Object.entries(preset.roles)) {
    for (const key of targetKeys(role, panel)) {
      const next = applyPatch(overrides[key] ?? {}, o)
      if (JSON.stringify(next) === JSON.stringify(overrides[key] ?? {})) continue
      overrides[key] = next
      changed = true
    }
  }
  return changed ? { ...design, overrides } : design
}
