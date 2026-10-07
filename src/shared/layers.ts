import { CARD_IDS, ELEMENTS, elementById, isMovableKey } from './elements'
import { SLOT_BOTTOM, isStickerPanel, placeSticker, reorderSticker, type Sticker, type StickerLayer, type StickerPanel } from './placement'
import type { Design } from './design'

export const STICKER_REF = 'sticker:'
export const MAX_ORDER = 200

export type Region = 'front' | 'behind' | 'under'
export const isRegion = (v: unknown): v is Region => v === 'front' || v === 'behind' || v === 'under'

export const stickerRef = (id: string) => `${STICKER_REF}${id}`

export const SURFACE_SUFFIX = '@bg'

export const layerBase = (id: string): string => (id.endsWith(SURFACE_SUFFIX) ? id.slice(0, -SURFACE_SUFFIX.length) : id)

export function isElementLayer(id: string, panel: string): boolean {
  const base = layerBase(id)
  const def = elementById(base)
  return def !== undefined && def.panel === panel && isMovableKey(base) && (base === id || CARD_IDS.includes(base))
}

export function panelElementIds(panel: string): string[] {
  return ELEMENTS.filter((e) => e.panel === panel && isMovableKey(e.id)).flatMap((e) => (CARD_IDS.includes(e.id) ? [e.id + SURFACE_SUFFIX, e.id] : [e.id]))
}

function usable(id: unknown, panel: string, stickers: Sticker[]): id is string {
  if (typeof id !== 'string') return false
  if (id.startsWith(STICKER_REF)) {
    const s = stickers.find((x) => x.id === id.slice(STICKER_REF.length))
    return s !== undefined && s.panel === panel && s.layer === 'front'
  }
  return isElementLayer(id, panel)
}

export function sanitizeOrder(raw: unknown, stickers: Sticker[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out
  for (const [panel, list] of Object.entries(raw)) {
    if (!isStickerPanel(panel) || !Array.isArray(list)) continue
    const seen = new Set<string>()
    const ids: string[] = []
    for (const id of list) {
      if (!usable(id, panel, stickers) || seen.has(id)) continue
      seen.add(id)
      ids.push(id)
      if (ids.length >= MAX_ORDER) break
    }
    if (ids.length > 0) out[panel] = ids
  }
  return out
}

export function frontStickers(stickers: Sticker[], panel: string): Sticker[] {
  return stickers.filter((s) => s.panel === panel && s.layer === 'front')
}

export function effectiveOrder(design: Pick<Design, 'order' | 'stickers'>, panel: string, domIds?: string[]): string[] {
  const stored = (design.order[panel] ?? []).filter((id) => usable(id, panel, design.stickers))
  const have = new Set(stored)
  const present = domIds ? domIds.filter((id) => usable(id, panel, design.stickers)) : panelElementIds(panel)
  const missingElements = present.filter((id) => !have.has(id))
  const missingStickers = frontStickers(design.stickers, panel).map((s) => stickerRef(s.id)).filter((id) => !have.has(id))
  return [...missingElements, ...stored, ...missingStickers]
}

export const isLayered = (design: Pick<Design, 'order' | 'stickers'>, panel: string): boolean =>
  design.order[panel] !== undefined || frontStickers(design.stickers, panel).length > 0

export function layerZ(design: Pick<Design, 'order' | 'stickers'>, panel: string, domIds?: string[]): Record<string, number> {
  const z: Record<string, number> = {}
  if (!isLayered(design, panel)) return z
  effectiveOrder(design, panel, domIds).forEach((id, i) => {
    z[id] = i + 1
  })
  return z
}

export function allLayerZ(design: Pick<Design, 'order' | 'stickers'>, dom: Record<string, string[]> = {}): Record<string, number> {
  const out: Record<string, number> = {}
  const panels = new Set<string>([...Object.keys(design.order), ...design.stickers.map((s) => s.panel)])
  for (const p of panels) Object.assign(out, layerZ(design, p, dom[p]))
  return out
}

export function arrange(design: Design, panel: string, id: string, region: Region, aboveId: string | null, domIds?: string[]): Design {
  if (!isStickerPanel(panel) || !isRegion(region)) return design
  const isSticker = id.startsWith(STICKER_REF)
  const sticker = isSticker ? design.stickers.find((s) => s.id === id.slice(STICKER_REF.length)) : undefined
  if (isSticker && (!sticker || sticker.panel !== panel)) return design
  if (!isSticker && !isElementLayer(id, panel)) return design
  if (!isSticker && region !== 'front') return design

  if (region === 'front') {
    const moved = sticker && sticker.layer !== 'front' ? design.stickers.map((s) => (s === sticker ? { ...s, layer: 'front' as StickerLayer } : s)) : design.stickers
    const withLayer = { ...design, stickers: moved }
    const rest = effectiveOrder(withLayer, panel, domIds).filter((x) => x !== id)
    let at = rest.length
    if (aboveId === SLOT_BOTTOM) at = 0
    else if (aboveId !== null) {
      const target = rest.indexOf(aboveId)
      if (target === -1) return design
      at = target + 1
    }
    const next = [...rest.slice(0, at), id, ...rest.slice(at)]
    const current = effectiveOrder(design, panel, domIds)
    if (moved === design.stickers && design.order[panel] !== undefined && next.length === current.length && next.every((x, i) => x === current[i])) return design
    return { ...withLayer, order: { ...design.order, [panel]: next } }
  }

  const sid = id.slice(STICKER_REF.length)
  const stickers = placeSticker(design.stickers, sid, region as StickerLayer, aboveId)
  if (stickers === design.stickers && sticker?.layer === region) return design
  const order = { ...design.order }
  if (order[panel]) order[panel] = order[panel].filter((x) => x !== id)
  if (order[panel]?.length === 0) delete order[panel]
  return { ...design, stickers, order }
}

export type StepDirection = 'forward' | 'back'

export function stepSticker(design: Design, panel: string, id: string, direction: StepDirection, domIds?: string[]): Design {
  if (!isStickerPanel(panel) || (direction !== 'forward' && direction !== 'back')) return design
  const sticker = design.stickers.find((s) => s.id === id && s.panel === panel)
  if (!sticker) return design
  const forward = direction === 'forward'
  const ref = stickerRef(id)

  if (sticker.layer === 'front') {
    if (panel === 'free') {
      const stickers = reorderSticker(design.stickers, id, direction)
      return stickers === design.stickers ? design : { ...design, stickers }
    }
    const order = effectiveOrder(design, panel, domIds)
    const i = order.indexOf(ref)
    if (i === -1) return design
    const j = forward ? i + 1 : i - 1
    if (j >= order.length) return design
    if (j < 0) return arrange(design, panel, ref, 'behind', null)
    const next = order.slice()
    next[i] = order[j]
    next[j] = ref
    return { ...design, order: { ...design.order, [panel]: next } }
  }

  const same = design.stickers.filter((s) => s.panel === panel && s.layer === sticker.layer)
  const position = same.findIndex((s) => s.id === id)
  const atTop = position === same.length - 1
  const atBottom = position === 0
  if (sticker.layer === 'behind') {
    if (forward && atTop) return arrange(design, panel, ref, 'front', SLOT_BOTTOM)
    if (!forward && atBottom) return arrange(design, panel, ref, 'under', null)
  } else if (forward && atTop) {
    return arrange(design, panel, ref, 'behind', SLOT_BOTTOM)
  } else if (!forward && atBottom) {
    return design
  }
  const stickers = reorderSticker(design.stickers, id, direction)
  return stickers === design.stickers ? design : { ...design, stickers }
}

export function stepLayer(design: Design, panel: string, id: string, direction: StepDirection, domIds?: string[]): Design {
  if (!isStickerPanel(panel) || (direction !== 'forward' && direction !== 'back') || !isElementLayer(id, panel)) return design
  const order = effectiveOrder(design, panel, domIds)
  const i = order.indexOf(id)
  const j = direction === 'forward' ? i + 1 : i - 1
  if (i === -1 || j < 0 || j >= order.length) return design
  const next = order.slice()
  next[i] = order[j]
  next[j] = id
  return { ...design, order: { ...design.order, [panel]: next } }
}

export function raiseSticker(design: Design, id: string): Design {
  const sticker = design.stickers.find((s) => s.id === id)
  if (!sticker) return design
  const last = [...design.stickers].reverse().find((s) => s.panel === sticker.panel && s.layer === sticker.layer)
  if (last?.id === id) return design
  const stickers = placeSticker(design.stickers, id, sticker.layer, null)
  return stickers === design.stickers ? design : { ...design, stickers }
}

export type { StickerPanel }
