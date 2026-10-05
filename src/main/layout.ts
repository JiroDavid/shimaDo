import type { PanelId, Settings } from '../shared/types'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export const MIN_SIZES: Record<PanelId, Size> = {
  bar: { width: 680, height: 56 },
  checklist: { width: 280, height: 280 },
  schedule: { width: 320, height: 320 },
  gym: { width: 320, height: 320 },
  progress: { width: 280, height: 280 },
  nicotine: { width: 280, height: 280 },
  settings: { width: 320, height: 360 },
  profile: { width: 300, height: 360 },
  confirm: { width: 320, height: 200 },
  mini: { width: 56, height: 56 }
}

const MARGIN = 16
const GAP = 12

export function effectiveSize(id: PanelId, saved: Size, defaults: Record<PanelId, Size>): Size {
  if (id === 'bar' || id === 'mini') return { width: defaults[id].width, height: defaults[id].height }
  const min = MIN_SIZES[id]
  return { width: Math.max(saved.width, min.width), height: Math.max(saved.height, min.height) }
}

export function defaultBounds(id: PanelId, area: Rect, panels: Settings['panels']): Rect {
  const { width, height } = panels[id]
  const left = area.x + MARGIN
  const top = area.y + MARGIN
  const right = area.x + area.width - MARGIN
  const belowBar = top + panels.bar.height + GAP
  switch (id) {
    case 'bar':
    case 'mini':
      return { x: left, y: top, width, height }
    case 'checklist':
      return { x: left, y: belowBar, width, height }
    case 'schedule':
      return { x: left + panels.checklist.width + GAP, y: belowBar, width, height }
    case 'gym':
      return { x: left + panels.checklist.width + GAP + panels.schedule.width + GAP, y: belowBar, width, height }
    case 'progress':
      return { x: right - width, y: top, width, height }
    case 'nicotine':
      return { x: right - width, y: top + panels.progress.height + GAP, width, height }
    case 'settings':
    case 'profile':
    case 'confirm':
      return { x: Math.round(area.x + (area.width - width) / 2), y: Math.round(area.y + (area.height - height) / 2), width, height }
  }
}
