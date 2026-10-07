export interface Box {
  left: number
  top: number
  width: number
  height: number
}

export interface Lines {
  xs: number[]
  ys: number[]
}

export interface SnapResult {
  dx: number
  dy: number
  guideX: number | null
  guideY: number | null
}

export const SNAP_DISTANCE = 6

export const boxLines = (b: Box): Lines => ({
  xs: [b.left, b.left + b.width / 2, b.left + b.width],
  ys: [b.top, b.top + b.height / 2, b.top + b.height]
})

function snapAxis(edges: number[], lines: number[], distance: number): { shift: number; guide: number | null } {
  let best: { shift: number; guide: number } | null = null
  for (const edge of edges) {
    for (const line of lines) {
      const shift = line - edge
      if (Math.abs(shift) <= distance && (!best || Math.abs(shift) < Math.abs(best.shift))) best = { shift, guide: line }
    }
  }
  return best ?? { shift: 0, guide: null }
}

export function snapDelta(start: Box, delta: { dx: number; dy: number }, targets: Lines, distance = SNAP_DISTANCE): SnapResult {
  const moved = boxLines({ ...start, left: start.left + delta.dx, top: start.top + delta.dy })
  const x = snapAxis(moved.xs, targets.xs, distance)
  const y = snapAxis(moved.ys, targets.ys, distance)
  return { dx: delta.dx + x.shift, dy: delta.dy + y.shift, guideX: x.guide, guideY: y.guide }
}
