import type { Edge } from '../shared/types'
import type { Rect, Size } from './layout'

export type { Edge }
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi))

export function resizeBounds(start: Rect, edge: Edge, dx: number, dy: number, min: Size, max: Size): Rect {
  let { x, y, width, height } = start
  const right = x + width
  const bottom = y + height
  if (edge.includes('e')) width = clamp(start.width + dx, min.width, max.width)
  if (edge.includes('s')) height = clamp(start.height + dy, min.height, max.height)
  if (edge.includes('w')) {
    width = clamp(start.width - dx, min.width, max.width)
    x = right - width
  }
  if (edge.includes('n')) {
    height = clamp(start.height - dy, min.height, max.height)
    y = bottom - height
  }
  return { x, y, width, height }
}

export function translateBounds(rect: Rect, from: Rect, to: Rect): Rect {
  const width = Math.min(rect.width, to.width)
  const height = Math.min(rect.height, to.height)
  return {
    x: clamp(to.x + (rect.x - from.x), to.x, to.x + to.width - width),
    y: clamp(to.y + (rect.y - from.y), to.y, to.y + to.height - height),
    width,
    height
  }
}

const overlap = (a: Rect, b: Rect) => ({
  w: Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
  h: Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
})

export function fitOnScreen(rect: Rect, areas: Rect[]): Rect {
  if (areas.length === 0) return rect
  if (areas.some((a) => {
    const o = overlap(rect, a)
    return o.w >= 120 && o.h >= 48
  })) return rect
  const a = areas[0]
  const width = Math.min(rect.width, a.width)
  const height = Math.min(rect.height, a.height)
  return {
    x: clamp(rect.x, a.x, a.x + a.width - width),
    y: clamp(rect.y, a.y, a.y + a.height - height),
    width,
    height
  }
}
