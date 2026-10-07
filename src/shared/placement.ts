import { ASSET_ID, type AssetInfo } from './assets'
import { elementById, isEditablePanel, isKnownKey, isMovableKey, isSurfaceKey, type EditablePanel } from './elements'
import { isEmoji } from './emoji'

export interface Move {
  x: number
  y: number
}

export const MOVE_LIMIT = 1500
export const MAX_STICKERS_PER_PANEL = 60
const POS: [number, number] = [-200, 4000]
const SIZE: [number, number] = [16, 600]
const FREE_POS: [number, number] = [-30000, 30000]
const FREE_SIZE: [number, number] = [16, 1600]
const OPACITY: [number, number] = [0.05, 1]
const BG_SCALE: [number, number] = [0.25, 4]
const BG_OFFSET: [number, number] = [-2000, 2000]
const STICKER_ID = /^[a-z0-9-]{8,40}$/

export const FREE_PANEL = 'free'
export type StickerPanel = EditablePanel | 'bar' | typeof FREE_PANEL
export const isStickerPanel = (v: unknown): v is StickerPanel => typeof v === 'string' && (v === 'bar' || v === FREE_PANEL || isEditablePanel(v))

export type StickerLayer = 'under' | 'behind' | 'front'
export const isLayer = (v: unknown): v is StickerLayer => v === 'under' || v === 'behind' || v === 'front'

export interface Crop {
  l: number
  t: number
  r: number
  b: number
}

export interface Anchor {
  el: string
  x: number
  y: number
}

export const ANCHOR_RANGE: [number, number] = [-6000, 6000]

export interface Sticker {
  id: string
  panel: StickerPanel
  kind: 'emoji' | 'image'
  emoji?: string
  asset?: string
  x: number
  y: number
  size: number
  layer: StickerLayer
  rotation?: number
  flipX?: boolean
  flipY?: boolean
  opacity?: number
  crop?: Crop
  round?: number
  anchor?: Anchor
}

export function parseAnchor(raw: unknown, panel: string): Anchor | null {
  if (!isObj(raw) || typeof raw.el !== 'string' || elementById(raw.el)?.panel !== panel) return null
  const x = int(raw.x, ANCHOR_RANGE)
  const y = int(raw.y, ANCHOR_RANGE)
  return x === null || y === null ? null : { el: raw.el, x, y }
}

export const MAX_CROP = 0.9
const CROP_SIDES = ['l', 't', 'r', 'b'] as const

export function parseCrop(raw: unknown): Crop | null {
  if (!isObj(raw)) return null
  const out = {} as Crop
  for (const side of CROP_SIDES) {
    const v = num(raw[side], [0, MAX_CROP])
    if (v === null) return null
    out[side] = Math.round(v * 1000) / 1000
  }
  if (out.l + out.r > MAX_CROP || out.t + out.b > MAX_CROP) return null
  return out.l === 0 && out.t === 0 && out.r === 0 && out.b === 0 ? null : out
}

export const normaliseRotation = (deg: number): number => Math.round((((((deg + 180) % 360) + 360) % 360) - 180) * 10) / 10

export const cropBox = (s: Pick<Sticker, 'size' | 'crop'>): { dx: number; dy: number; width: number; height: number } => {
  const c = s.crop ?? { l: 0, t: 0, r: 0, b: 0 }
  const r2 = (n: number) => Math.round(n * 100) / 100
  return { dx: r2(c.l * s.size), dy: r2(c.t * s.size), width: r2(s.size * (1 - c.l - c.r)), height: r2(s.size * (1 - c.t - c.b)) }
}

export type StickerDraft = Omit<Sticker, 'id'>

export interface Background {
  asset: string
  fit: 'cover' | 'contain' | 'tile'
  opacity: number
  scale?: number
  x?: number
  y?: number
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
  const free = raw.panel === FREE_PANEL
  const layer = free ? 'front' : raw.layer === 'cards' || raw.layer === 'between' ? 'front' : raw.layer
  if (!isLayer(layer)) return null
  const x = int(raw.x, free ? FREE_POS : POS)
  const y = int(raw.y, free ? FREE_POS : POS)
  const size = int(raw.size, free ? FREE_SIZE : SIZE)
  if (x === null || y === null || size === null) return null
  const base: Omit<Sticker, 'kind'> = { id, panel: raw.panel, x, y, size, layer }
  const rotation = num(raw.rotation, [-360, 360])
  if (rotation !== null && normaliseRotation(rotation) !== 0) base.rotation = normaliseRotation(rotation)
  if (raw.flipX === true) base.flipX = true
  if (raw.flipY === true) base.flipY = true
  const opacity = num(raw.opacity, OPACITY)
  if (opacity !== null && opacity < 1) base.opacity = Math.round(opacity * 100) / 100
  const round = int(raw.round, [0, 50])
  if (round) base.round = round
  const anchor = free ? null : parseAnchor(raw.anchor, raw.panel as string)
  if (anchor) base.anchor = anchor
  if (raw.kind === 'emoji') return isEmoji(raw.emoji) ? { ...base, kind: 'emoji', emoji: raw.emoji } : null
  if (raw.kind === 'image') {
    if (typeof raw.asset !== 'string' || !ASSET_ID.test(raw.asset) || !Object.prototype.hasOwnProperty.call(assets, raw.asset)) return null
    const crop = parseCrop(raw.crop)
    return { ...base, kind: 'image', asset: raw.asset, ...(crop ? { crop } : {}) }
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
  if (opacity === null) return null
  const out: Background = { asset: raw.asset, fit: raw.fit, opacity }
  const scale = num(raw.scale, BG_SCALE)
  const x = int(raw.x, BG_OFFSET)
  const y = int(raw.y, BG_OFFSET)
  if (scale !== null && scale !== 1) out.scale = Math.round(scale * 100) / 100
  if (x !== null && x !== 0) out.x = x
  if (y !== null && y !== 0) out.y = y
  return out
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

function sameSticker(a: Sticker, b: Sticker): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    const x = (a as unknown as Record<string, unknown>)[k]
    const y = (b as unknown as Record<string, unknown>)[k]
    if (typeof x === 'object' && x !== null && typeof y === 'object' && y !== null) {
      if (JSON.stringify(Object.entries(x).sort()) !== JSON.stringify(Object.entries(y).sort())) return false
    } else if (x !== y) return false
  }
  return true
}

const STYLE_KEYS = ['rotation', 'flipX', 'flipY', 'opacity', 'crop', 'round', 'anchor'] as const

export function updateSticker(stickers: Sticker[], id: string, patch: unknown, assets: Record<string, AssetInfo>): Sticker[] {
  const index = stickers.findIndex((s) => s.id === id)
  if (index === -1 || !isObj(patch)) return stickers
  const current = stickers[index]
  const merged = {
    ...current,
    ...(patch.x !== undefined ? { x: patch.x } : {}),
    ...(patch.y !== undefined ? { y: patch.y } : {}),
    ...(patch.size !== undefined ? { size: patch.size } : {}),
    ...(patch.layer !== undefined ? { layer: patch.layer } : {}),
    ...Object.fromEntries(STYLE_KEYS.filter((k) => k in patch).map((k) => [k, patch[k]])),
    ...(('x' in patch || 'y' in patch) && !('anchor' in patch) ? { anchor: undefined } : {})
  }
  const next = parseSticker(merged, assets)
  if (!next || sameSticker(next, current)) return stickers
  return stickers.map((s, i) => (i === index ? next : s))
}

export function deleteSticker(stickers: Sticker[], id: string): Sticker[] {
  return stickers.some((s) => s.id === id) ? stickers.filter((s) => s.id !== id) : stickers
}

export function duplicateSticker(stickers: Sticker[], id: string, newId: string): Sticker[] | null {
  const original = stickers.find((s) => s.id === id)
  if (!original) return null
  const copy: Sticker = { ...original, id: newId, x: original.x + 24, y: original.y + 24, ...(original.anchor ? { anchor: { ...original.anchor, x: original.anchor.x + 24, y: original.anchor.y + 24 } } : {}) }
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
  if (!next || (existing && existing.asset === next.asset && existing.fit === next.fit && existing.opacity === next.opacity && existing.scale === next.scale && existing.x === next.x && existing.y === next.y)) return backgrounds
  return { ...backgrounds, [key]: next }
}

export function stickerStart(count: number): { x: number; y: number } {
  const step = (count % 10) * 24
  return { x: 40 + step, y: 90 + step }
}

export function movedOn(moves: Record<string, Move>, panel: StickerPanel): string[] {
  return Object.keys(moves).filter((key) => elementById(key)?.panel === panel)
}

export function reorderSticker(stickers: Sticker[], id: string, direction: 'forward' | 'back'): Sticker[] {
  if (direction !== 'forward' && direction !== 'back') return stickers
  const index = stickers.findIndex((s) => s.id === id)
  if (index === -1) return stickers
  const self = stickers[index]
  const step = direction === 'forward' ? 1 : -1
  for (let i = index + step; i >= 0 && i < stickers.length; i += step) {
    if (stickers[i].panel === self.panel && stickers[i].layer === self.layer) {
      const copy = stickers.slice()
      copy[index] = stickers[i]
      copy[i] = self
      return copy
    }
  }
  return stickers
}

export const SLOT_BOTTOM = 'bottom'
export function placeSticker(stickers: Sticker[], id: string, layer: StickerLayer, aboveId: string | null): Sticker[] {
  if (!isLayer(layer)) return stickers
  const index = stickers.findIndex((s) => s.id === id)
  if (index === -1 || aboveId === id) return stickers
  const self = stickers[index]
  const rest = stickers.filter((s) => s.id !== id)
  const moved = self.layer === layer ? self : { ...self, layer }
  let at = rest.length
  if (aboveId === SLOT_BOTTOM) {
    const first = rest.findIndex((s) => s.panel === self.panel && s.layer === layer)
    if (first !== -1) at = first
  } else if (aboveId !== null) {
    const target = rest.findIndex((s) => s.id === aboveId)
    if (target === -1 || rest[target].panel !== self.panel || rest[target].layer !== layer) return stickers
    at = target + 1
  } else {
    const top = rest.reduce((last, s, i) => (s.panel === self.panel && s.layer === layer ? i : last), -1)
    if (top !== -1) at = top + 1
  }
  const next = [...rest.slice(0, at), moved, ...rest.slice(at)]
  return next.every((s, i) => s === stickers[i]) ? stickers : next
}

export function retargetSticker(
  stickers: Sticker[],
  id: string,
  to: { panel: unknown; x: unknown; y: unknown; size: unknown },
  assets: Record<string, AssetInfo>
): Sticker[] {
  const index = stickers.findIndex((s) => s.id === id)
  if (index === -1 || !isStickerPanel(to.panel)) return stickers
  const current = stickers[index]
  if (to.panel !== current.panel && perPanel(stickers, to.panel) >= MAX_STICKERS_PER_PANEL) return stickers
  const next = parseSticker({ ...current, panel: to.panel, x: to.x, y: to.y, size: to.size, layer: 'front', anchor: undefined }, assets)
  return next ? stickers.map((s, i) => (i === index ? next : s)) : stickers
}

export interface AssetUse {
  panel: string
  kind: 'sticker' | 'background'
  count: number
}

export function assetUsage(stickers: Sticker[], backgrounds: Record<string, Background>): Record<string, AssetUse[]> {
  const out: Record<string, AssetUse[]> = {}
  const add = (asset: string, panel: string, kind: AssetUse['kind']) => {
    const list = (out[asset] ??= [])
    const found = list.find((u) => u.panel === panel && u.kind === kind)
    if (found) found.count++
    else list.push({ panel, kind, count: 1 })
  }
  for (const s of stickers) if (s.kind === 'image' && s.asset) add(s.asset, s.panel, 'sticker')
  for (const [key, bg] of Object.entries(backgrounds)) {
    const panel = key === 'bar.surface' ? 'bar' : key === 'group:panel' ? 'all' : key.endsWith('.panel') ? key.slice(0, -'.panel'.length) : key
    add(bg.asset, panel, 'background')
  }
  return out
}
