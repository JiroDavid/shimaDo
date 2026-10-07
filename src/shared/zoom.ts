export const ZOOM_MIN = 0.1
export const ZOOM_MAX = 5

export const ZOOM_STEPS = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5]

export type ZoomAction = 'in' | 'out' | 'reset'
export const isZoomAction = (v: unknown): v is ZoomAction => v === 'in' || v === 'out' || v === 'reset'

export const clampZoom = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v)) * 100) / 100 : 1

export function stepZoom(current: unknown, action: ZoomAction): number {
  if (action === 'reset') return 1
  const c = clampZoom(current)
  if (action === 'in') return ZOOM_STEPS.find((s) => s > c + 1e-9) ?? ZOOM_MAX
  return [...ZOOM_STEPS].reverse().find((s) => s < c - 1e-9) ?? ZOOM_MIN
}

export const ZOOMABLE = ['checklist', 'schedule', 'gym', 'progress', 'habits', 'focus', 'notepad', 'settings', 'profile', 'welcome', 'confirm'] as const
