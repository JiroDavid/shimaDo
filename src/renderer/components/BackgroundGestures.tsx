import { useContext, useEffect } from 'react'
import { useEditState } from '../hooks/useEditState'
import { measureScale } from '../lib/measureScale'
import { DesignContext } from './EditableText'
import { backgroundKey } from './PlacedLayer'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function BackgroundGestures({ panel }: { panel: string }) {
  const edit = useEditState()
  const design = useContext(DesignContext)

  useEffect(() => {
    if (!edit.active) return
    const target = () => {
      const own = backgroundKey(panel)
      if (design.backgrounds[own]) return { key: own, bg: design.backgrounds[own] }
      const group = design.backgrounds['group:panel']
      return panel !== 'bar' && group ? { key: 'group:panel', bg: group } : null
    }
    const scaleOf = () => measureScale(document.querySelector('.placed-back'))

    let drag: { sx: number; sy: number; x: number; y: number; scale: number } | null = null

    const onDown = (e: PointerEvent) => {
      if (!e.altKey || e.button !== 0) return
      const t = target()
      if (!t) return
      e.preventDefault()
      e.stopPropagation()
      drag = { sx: e.clientX, sy: e.clientY, x: t.bg.x ?? 0, y: t.bg.y ?? 0, scale: scaleOf() }
    }
    const onMove = (e: PointerEvent) => {
      const t = target()
      if (!drag || !t) return
      e.stopPropagation()
      const x = clamp(Math.round(drag.x + (e.clientX - drag.sx) / drag.scale), -2000, 2000)
      const y = clamp(Math.round(drag.y + (e.clientY - drag.sy) / drag.scale), -2000, 2000)
      if (x !== (t.bg.x ?? 0) || y !== (t.bg.y ?? 0)) window.shima.editBackground(t.key, { ...t.bg, x, y })
    }
    const onUp = () => {
      drag = null
    }
    const onWheel = (e: WheelEvent) => {
      if (!e.altKey) return
      const t = target()
      if (!t) return
      e.preventDefault()
      const scale = clamp(Math.round((t.bg.scale ?? 1) * Math.exp(-e.deltaY * 0.0015) * 100) / 100, 0.25, 4)
      if (scale !== (t.bg.scale ?? 1)) window.shima.editBackground(t.key, { ...t.bg, scale })
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerup', onUp, true)
    document.addEventListener('wheel', onWheel, { capture: true, passive: false })
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerup', onUp, true)
      document.removeEventListener('wheel', onWheel, true)
    }
  }, [edit.active, panel, design.backgrounds])

  return null
}
