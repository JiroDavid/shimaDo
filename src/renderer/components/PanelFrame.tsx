import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import type { Edge, PanelId } from '../../shared/types'
import { Fit } from './Fit'

const E = 8
const C = 20
const HANDLES: { edge: Edge; style: CSSProperties; cursor: string }[] = [
  { edge: 'n', style: { top: 0, left: C, right: C, height: E }, cursor: 'ns-resize' },
  { edge: 's', style: { bottom: 0, left: C, right: C, height: E }, cursor: 'ns-resize' },
  { edge: 'w', style: { left: 0, top: C, bottom: C, width: E }, cursor: 'ew-resize' },
  { edge: 'e', style: { right: 0, top: C, bottom: C, width: E }, cursor: 'ew-resize' },
  { edge: 'nw', style: { top: 0, left: 0, width: C, height: C }, cursor: 'nwse-resize' },
  { edge: 'ne', style: { top: 0, right: 0, width: C, height: C }, cursor: 'nesw-resize' },
  { edge: 'sw', style: { bottom: 0, left: 0, width: C, height: C }, cursor: 'nesw-resize' },
  { edge: 'se', style: { bottom: 0, right: 0, width: C, height: C }, cursor: 'nwse-resize' }
]

export function PanelFrame({ id, title, fit = 'width', children }: { id: PanelId; title: string; fit?: 'width' | 'both'; children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      frame.current?.animate(
        [
          { opacity: 0, transform: 'translateY(10px) scale(0.98)' },
          { opacity: 1, transform: 'none' }
        ],
        { duration: 240, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
      )
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const begin = (edge: Edge) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    window.shima.beginResize(id, edge)
  }
  const end = () => window.shima.endResize()

  return (
    <div className="panel panel-enter" ref={frame}>
      <div className="titlebar flex items-center gap-3 px-5 pb-1 pt-4">
        <button className="dot-btn no-drag" aria-label="Hide panel" onClick={() => window.shima.hidePanel(id)} />
        <span className="heading flex-1 text-center text-[1.05rem] tracking-[0.12em] text-muted">{title}</span>
        <span className="w-4" />
      </div>
      <Fit mode={fit}>{children}</Fit>
      {HANDLES.map((h) => (
        <div
          key={h.edge}
          className="resize-handle"
          style={{ ...h.style, cursor: h.cursor }}
          onPointerDown={begin(h.edge)}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={end}
        />
      ))}
    </div>
  )
}
