import { cropBox, type Sticker } from './placement'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

type Geometry = Pick<Sticker, 'x' | 'y' | 'size' | 'crop' | 'rotation'>

export function boxCentre(s: Geometry): { x: number; y: number } {
  const box = cropBox(s)
  return { x: s.x + box.dx + box.width / 2, y: s.y + box.dy + box.height / 2 }
}

export function floatBounds(source: Geometry, cropping = false): Rect {
  const s = cropping ? { ...source, crop: undefined } : source
  const box = cropBox(s)
  const theta = ((s.rotation ?? 0) * Math.PI) / 180
  const across = Math.abs(box.width * Math.cos(theta)) + Math.abs(box.height * Math.sin(theta))
  const down = Math.abs(box.width * Math.sin(theta)) + Math.abs(box.height * Math.cos(theta))
  const width = Math.max(8, Math.ceil(across))
  const height = Math.max(8, Math.ceil(down))
  const c = boxCentre(s)
  return { x: Math.round(c.x - width / 2), y: Math.round(c.y - height / 2), width, height }
}

export function positionFromCentre(cx: number, cy: number, s: Pick<Sticker, 'size' | 'crop'>): { x: number; y: number } {
  const box = cropBox(s)
  return { x: Math.round(cx - box.dx - box.width / 2), y: Math.round(cy - box.dy - box.height / 2) }
}

export function pointInRect(p: { x: number; y: number }, r: Rect): boolean {
  return p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height
}
