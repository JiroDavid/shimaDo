import type { PanelId, Settings } from '../shared/types'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const MARGIN = 16
const GAP = 12

export function defaultBounds(id: PanelId, area: Rect, panels: Settings['panels']): Rect {
  const { width, height } = panels[id]
  const left = area.x + MARGIN
  const top = area.y + MARGIN
  const right = area.x + area.width - MARGIN
  const belowBar = top + panels.bar.height + GAP
  switch (id) {
    case 'bar':
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
      return { x: Math.round(area.x + (area.width - width) / 2), y: Math.round(area.y + (area.height - height) / 2), width, height }
  }
}
