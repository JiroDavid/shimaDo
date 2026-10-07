import { cropBox, type Anchor, type Sticker, type StickerPanel } from '../../shared/placement'
import { elementById, isMovableKey } from '../../shared/elements'

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

export interface Candidate {
  id: string
  box: Box
}

const inside = (p: { x: number; y: number }, b: Box) => p.x >= b.left && p.x <= b.left + b.width && p.y >= b.top && p.y <= b.top + b.height

export function pickAnchorElement(centre: { x: number; y: number }, candidates: Candidate[]): Candidate | null {
  let best: Candidate | null = null
  for (const c of candidates) {
    if (c.box.width <= 0 || c.box.height <= 0 || !inside(centre, c.box)) continue
    if (!best || c.box.width * c.box.height < best.box.width * best.box.height) best = c
  }
  return best
}

export function anchorFor(sticker: Pick<Sticker, 'x' | 'y' | 'size' | 'crop'>, candidates: Candidate[]): Anchor | null {
  const box = cropBox(sticker)
  const centre = { x: sticker.x + box.dx + box.width / 2, y: sticker.y + box.dy + box.height / 2 }
  const hit = pickAnchorElement(centre, candidates)
  if (!hit) return null
  return { el: hit.id, x: Math.round(sticker.x - hit.box.left), y: Math.round(sticker.y - hit.box.top) }
}

export function resolveAnchor(anchor: Anchor, elements: Record<string, Box>): { x: number; y: number } | null {
  const box = elements[anchor.el]
  return box ? { x: Math.round(box.left + anchor.x), y: Math.round(box.top + anchor.y) } : null
}

export interface PanelSpace {
  originX: number
  originY: number
  scale: number
}

export function panelSpace(): PanelSpace | null {
  const panel = document.querySelector<HTMLElement>('.panel, .bar')
  if (!panel) return null
  const r = panel.getBoundingClientRect()
  const k = parseFloat(getComputedStyle(panel).getPropertyValue('--fit'))
  return { originX: r.left + panel.clientLeft, originY: r.top + panel.clientTop, scale: Number.isFinite(k) && k > 0 ? k : 1 }
}

export function elementBoxes(panel: StickerPanel, space: PanelSpace, doc: Document = document): Record<string, Box> {
  const out: Record<string, Box> = {}
  doc.querySelectorAll<HTMLElement>('[data-el]').forEach((n) => {
    const id = n.getAttribute('data-el') ?? ''
    if (out[id] || elementById(id)?.panel !== panel || !isMovableKey(id)) return
    const r = n.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return
    out[id] = { left: (r.left - space.originX) / space.scale, top: (r.top - space.originY) / space.scale, width: r.width / space.scale, height: r.height / space.scale }
  })
  return out
}

export const boxesAsCandidates = (boxes: Record<string, Box>): Candidate[] => Object.entries(boxes).map(([id, box]) => ({ id, box }))
