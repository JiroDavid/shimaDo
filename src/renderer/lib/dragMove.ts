import { MOVE_LIMIT } from '../../shared/placement'

export const DRAG_THRESHOLD = 4

export const exceedsThreshold = (dx: number, dy: number): boolean => Math.hypot(dx, dy) >= DRAG_THRESHOLD

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const safeScale = (scale: number) => (Number.isFinite(scale) && scale > 0 ? scale : 1)

export function dragOffset(start: { x: number; y: number }, delta: { dx: number; dy: number }, scale: number): { x: number; y: number } {
  const s = safeScale(scale)
  return {
    x: clamp(Math.round(start.x + delta.dx / s), -MOVE_LIMIT, MOVE_LIMIT),
    y: clamp(Math.round(start.y + delta.dy / s), -MOVE_LIMIT, MOVE_LIMIT)
  }
}

export const elementScale = (rectWidth: number, offsetWidth: number): number =>
  Number.isFinite(rectWidth) && Number.isFinite(offsetWidth) && rectWidth > 0 && offsetWidth > 0 ? rectWidth / offsetWidth : 1

export function stickerPosition(start: { x: number; y: number }, delta: { dx: number; dy: number }, scale = 1): { x: number; y: number } {
  const s = safeScale(scale)
  return { x: clamp(Math.round(start.x + delta.dx / s), -200, 4000), y: clamp(Math.round(start.y + delta.dy / s), -200, 4000) }
}

export const stickerResize = (startSize: number, delta: { dx: number; dy: number }, scale = 1): number =>
  clamp(Math.round(startSize + (delta.dx + delta.dy) / 2 / safeScale(scale)), 16, 600)

export function dropPosition(client: { x: number; y: number }, rect: { left: number; top: number }, size: number, scale: number, index = 0): { x: number; y: number } {
  const s = safeScale(scale)
  return { x: Math.round((client.x - rect.left) / s - size / 2 + index * 20), y: Math.round((client.y - rect.top) / s - size / 2 + index * 20) }
}

export function nudgeDelta(key: string, shift: boolean): { x: number; y: number } | null {
  const step = shift ? 10 : 1
  if (key === 'ArrowLeft') return { x: -step, y: 0 }
  if (key === 'ArrowRight') return { x: step, y: 0 }
  if (key === 'ArrowUp') return { x: 0, y: -step }
  if (key === 'ArrowDown') return { x: 0, y: step }
  return null
}
