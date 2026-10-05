import { useRef, type ReactNode } from 'react'
import type { PanelId } from '../../shared/types'

export function PanelFrame({ id, title, children }: { id: PanelId; title: string; children: ReactNode }) {
  const pending = useRef<number | null>(null)

  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const start = { x: e.screenX, y: e.screenY, w: window.innerWidth, h: window.innerHeight }
    const move = (ev: PointerEvent) => {
      if (pending.current !== null) return
      pending.current = requestAnimationFrame(() => {
        pending.current = null
        window.shima.resizePanel(id, start.w + ev.screenX - start.x, start.h + ev.screenY - start.y)
      })
    }
    const up = () => {
      el.releasePointerCapture(e.pointerId)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }

  return (
    <div className="panel">
      <span className="corner corner-tl" />
      <span className="corner corner-tr" />
      <span className="corner corner-bl" />
      <span className="corner corner-br" />
      <div className="titlebar flex items-center gap-2 border-b border-dark-border px-3 py-2">
        <button className="dot-btn no-drag bg-brick" aria-label="Hide panel" onClick={() => window.shima.hidePanel(id)} />
        <span className="panel-label flex-1 text-center">{title}</span>
        <span className="w-3" />
      </div>
      <div className="win-body">{children}</div>
      <div
        className="no-drag absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
        style={{ background: 'linear-gradient(135deg, transparent 50%, var(--accent) 50%)', opacity: 0.6 }}
        onPointerDown={startResize}
      />
    </div>
  )
}
