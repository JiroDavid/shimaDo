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
  bar: { width: 320, height: 32 },
  checklist: { width: 220, height: 240 },
  schedule: { width: 240, height: 260 },
  gym: { width: 240, height: 260 },
  progress: { width: 200, height: 180 },
  nicotine: { width: 200, height: 180 },
  settings: { width: 260, height: 300 },
  profile: { width: 240, height: 300 },
  confirm: { width: 280, height: 160 },
  mini: { width: 64, height: 64 }
}

const MARGIN = 16
const GAP = 12

export function minSize(id: PanelId, scale = 1): Size {
  return { width: Math.round(MIN_SIZES[id].width * scale), height: Math.round(MIN_SIZES[id].height * scale) }
}

export function effectiveSize(id: PanelId, saved: Size, defaults: Record<PanelId, Size>, scale = 1): Size {
  if (id === 'mini') {
    return { width: Math.round(defaults[id].width * scale), height: Math.round(defaults[id].height * scale) }
  }
  const min = minSize(id, scale)
  return { width: Math.max(saved.width, min.width), height: Math.max(saved.height, min.height) }
}

export function scaledPanels(panels: Settings['panels'], scale: number): Settings['panels'] {
  const out = {} as Settings['panels']
  for (const id of Object.keys(panels) as PanelId[]) {
    out[id] = { ...panels[id], width: Math.round(panels[id].width * scale), height: Math.round(panels[id].height * scale) }
  }
  return out
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
