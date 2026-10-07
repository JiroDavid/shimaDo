import { MAX_CROP, normaliseRotation, type Crop } from './placement'

const clamp = (v: number, hi: number) => Math.round(Math.min(hi, Math.max(0, v)) * 1000) / 1000

export function cropFromDrag(start: Crop, handle: string, delta: { dx: number; dy: number }, size: number, rotation = 0): Crop {
  const rad = (-rotation * Math.PI) / 180
  const rx = delta.dx * Math.cos(rad) - delta.dy * Math.sin(rad)
  const ry = delta.dx * Math.sin(rad) + delta.dy * Math.cos(rad)
  const fx = rx / size
  const fy = ry / size
  const next = { ...start }
  if (handle.includes('w')) next.l = clamp(start.l + fx, MAX_CROP - start.r)
  if (handle.includes('e')) next.r = clamp(start.r - fx, MAX_CROP - start.l)
  if (handle.includes('n')) next.t = clamp(start.t + fy, MAX_CROP - start.b)
  if (handle.includes('s')) next.b = clamp(start.b - fy, MAX_CROP - start.t)
  return next
}

export const angleFrom = (centre: { x: number; y: number }, p: { x: number; y: number }): number => (Math.atan2(p.x - centre.x, -(p.y - centre.y)) * 180) / Math.PI

export function rotationFromDrag(start: number, angle0: number, angle: number, snapFifteen: boolean): number {
  let deg = start + (angle - angle0)
  if (snapFifteen) deg = Math.round(deg / 15) * 15
  else {
    const near = Math.round(deg / 90) * 90
    if (Math.abs(deg - near) < 4) deg = near
  }
  return normaliseRotation(deg)
}
