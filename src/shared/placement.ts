import { ASSET_ID, type AssetInfo } from './assets'
import { isEditablePanel, isKnownKey, isMovableKey, isSurfaceKey, type EditablePanel } from './elements'
import { isEmoji } from './emoji'

export interface Move {
  x: number
  y: number
}

export const MOVE_LIMIT = 1500
export const MAX_STICKERS_PER_PANEL = 60
const POS: [number, number] = [-200, 4000]
const SIZE: [number, number] = [16, 600]
const OPACITY: [number, number] = [0.05, 1]
const STICKER_ID = /^[a-z0-9-]{8,40}$/

export type StickerPanel = EditablePanel | 'bar'
export const isStickerPanel = (v: unknown): v is StickerPanel => typeof v === 'string' && (v === 'bar' || isEditablePanel(v))

export interface Sticker {
  id: string
  panel: StickerPanel
  kind: 'emoji' | 'image'
  emoji?: string
  asset?: string
  x: number
  y: number
  size: number
  layer: 'front' | 'behind'
}

export type StickerDraft = Omit<Sticker, 'id'>

export interface Background {
  asset: string
  fit: 'cover' | 'contain' | 'tile'
  opacity: number
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, [lo, hi]: [number, number]): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null
const int = (v: unknown, range: [number, number]): number | null => {
  const n = num(v, range)
  return n === null ? null : Math.round(n)
}

function parseMove(raw: unknown): Move | null {
  if (!isObj(raw)) return null
  const x = int(raw.x, [-MOVE_LIMIT, MOVE_LIMIT])
  const y = int(raw.y, [-MOVE_LIMIT, MOVE_LIMIT])
  return x === null || y === null ? null : { x, y }
}

export function sanitizeMoves(raw: unknown): Record<string, Move> {
  const out: Record<string, Move> = {}
  if (!isObj(raw)) return out
  for (const [key, v] of Object.entries(raw)) {
    if (!isMovableKey(key)) continue
    const m = parseMove(v)
    if (m && (m.x !== 0 || m.y !== 0)) out[key] = m
  }
  return out
}

function parseSticker(raw: unknown, assets: Record<string, AssetInfo>, forcedId?: string): Sticker | null {
  if (!isObj(raw)) return null
  const id = forcedId ?? raw.id
  if (typeof id !== 'string' || !STICKER_ID.test(id)) return null
  if (!isStickerPanel(raw.panel)) return null
  const layer = raw.layer
  if (layer !== 'front' && layer !== 'behind') return null
  const x = int(raw.x, POS)
  const y = int(raw.y, POS)
  const size = int(raw.size, SIZE)
  if (x === null || y === null || size === null) return null
  const base: Omit<Sticker, 'kind'> = { id, panel: raw.panel, x, y, size, layer }
  if (raw.kind === 'emoji') return isEmoji(raw.emoji) ? { ...base, kind: 'emoji', emoji: raw.emoji } : null
  if (raw.kind === 'image') {
    return typeof raw.asset === 'string' && ASSET_ID.test(raw.asset) && Object.prototype.hasOwnProperty.call(assets, raw.asset)
      ? { ...base, kind: 'image', asset: raw.asset }
      : null
  }
  return null
}

const perPanel = (list: Sticker[], panel: StickerPanel) => list.filter((s) => s.panel === panel).length

export function sanitizeStickers(raw: unknown, assets: Record<string, AssetInfo>): Sticker[] {
  if (!Array.isArray(raw)) return []
  const out: Sticker[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const s = parseSticker(item, assets)
    if (!s || seen.has(s.id) || perPanel(out, s.panel) >= MAX_STICKERS_PER_PANEL) continue
    seen.add(s.id)
    out.push(s)
  }
  return out
}

function parseBackground(raw: unknown, assets: Record<string, AssetInfo>): Background | null {
  if (!isObj(raw)) return null
  if (typeof raw.asset !== 'string' || !ASSET_ID.test(raw.asset) || !Object.prototype.hasOwnProperty.call(assets, raw.asset)) return null
  if (raw.fit !== 'cover' && raw.fit !== 'contain' && raw.fit !== 'tile') return null
  const opacity = num(raw.opacity, OPACITY)
  return opacity === null ? null : { asset: raw.asset, fit: raw.fit, opacity }
}

export function sanitizeBackgrounds(raw: unknown, assets: Record<string, AssetInfo>): Record<string, Background> {
  const out: Record<string, Background> = {}
  if (!isObj(raw)) return out
  for (const [key, v] of Object.entries(raw)) {
    if (!isKnownKey(key) || !isSurfaceKey(key)) continue
    const bg = parseBackground(v, assets)
    if (bg) out[key] = bg
  }
  return out
}

export function setMove(moves: Record<string, Move>, key: string, move: unknown): Record<string, Move> {
  if (!isMovableKey(key)) return moves
  const existing = Object.prototype.hasOwnProperty.call(moves, key) ? moves[key] : undefined
  const next = move === null ? null : parseMove(move)
  if (move !== null && next === null) return moves
  const cleared = next === null || (next.x === 0 && next.y === 0)
  if (cleared) {
    if (!existing) return moves
    const copy = { ...moves }
    delete copy[key]
    return copy
  }
  if (existing && existing.x === next.x && existing.y === next.y) return moves
  return { ...moves, [key]: next }
}

export function addSticker(stickers: Sticker[], draft: unknown, assets: Record<string, AssetInfo>, id: string): Sticker[] | null {
  if (!isObj(draft)) return null
  const s = parseSticker(draft, assets, id)
  if (!s || perPanel(stickers, s.panel) >= MAX_STICKERS_PER_PANEL || stickers.some((x) => x.id === s.id)) return null
  return [...stickers, s]
}

export function updateSticker(stickers: Sticker[], id: string, patch: unknown, assets: Record<string, AssetInfo>): Sticker[] {
  const index = stickers.findIndex((s) => s.id === id)
  if (index === -1 || !isObj(patch)) return stickers
  const current = stickers[index]
  const merged = {
    ...current,
    ...(patch.x !== undefined ? { x: patch.x } : {}),
    ...(patch.y !== undefined ? { y: patch.y } : {}),
    ...(patch.size !== undefined ? { size: patch.size } : {}),
    ...(patch.layer !== undefined ? { layer: patch.layer } : {})
  }
  const next = parseSticker(merged, assets)
  if (!next || (next.x === current.x && next.y === current.y && next.size === current.size && next.layer === current.layer)) return stickers
  return stickers.map((s, i) => (i === index ? next : s))
}

export function deleteSticker(stickers: Sticker[], id: string): Sticker[] {
  return stickers.some((s) => s.id === id) ? stickers.filter((s) => s.id !== id) : stickers
}

export function duplicateSticker(stickers: Sticker[], id: string, newId: string): Sticker[] | null {
  const original = stickers.find((s) => s.id === id)
  if (!original) return null
  const copy = { ...original, id: newId, x: original.x + 24, y: original.y + 24 }
  if (!STICKER_ID.test(newId) || perPanel(stickers, copy.panel) >= MAX_STICKERS_PER_PANEL || stickers.some((s) => s.id === newId)) return null
  return [...stickers, copy]
}

export function setBackground(backgrounds: Record<string, Background>, key: string, bg: unknown, assets: Record<string, AssetInfo>): Record<string, Background> {
  if (!isKnownKey(key) || !isSurfaceKey(key)) return backgrounds
  const existing = Object.prototype.hasOwnProperty.call(backgrounds, key) ? backgrounds[key] : undefined
  if (bg === null) {
    if (!existing) return backgrounds
    const copy = { ...backgrounds }
    delete copy[key]
    return copy
  }
  const next = parseBackground(bg, assets)
  if (!next || (existing && existing.asset === next.asset && existing.fit === next.fit && existing.opacity === next.opacity)) return backgrounds
  return { ...backgrounds, [key]: next }
}
