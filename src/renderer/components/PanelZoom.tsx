import { useEffect } from 'react'
import type { PanelId } from '../../shared/types'
import type { ZoomAction } from '../../shared/zoom'

export function zoomActionFor(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): ZoomAction | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null
  if (e.key === '+' || e.key === '=') return 'in'
  if (e.key === '-' || e.key === '_') return 'out'
  if (e.key === '0') return 'reset'
  return null
}

export function PanelZoom({ panel }: { panel: PanelId }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = zoomActionFor(e)
      if (!action) return
      e.preventDefault()
      window.shima.zoomPanel(panel, action)
    }
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.deltaY === 0) return
      e.preventDefault()
      window.shima.zoomPanel(panel, e.deltaY < 0 ? 'in' : 'out')
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('wheel', onWheel, { passive: false, capture: true })
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('wheel', onWheel, true)
    }
  }, [panel])
  return null
}
