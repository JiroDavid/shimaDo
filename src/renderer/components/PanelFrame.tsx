import { useEffect, useRef, type ReactNode } from 'react'
import type { PanelId } from '../../shared/types'
import { Fit } from './Fit'
import { ResizeHandles } from './ResizeHandles'

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

  return (
    <div className="panel panel-enter" ref={frame}>
      <div className="titlebar flex items-center gap-3 px-5 pb-1 pt-4">
        <button className="dot-btn no-drag" aria-label="Hide panel" onClick={() => window.shima.hidePanel(id)} />
        <span className="heading flex-1 text-center text-[1.05rem] tracking-[0.12em] text-muted">{title}</span>
        <span className="w-4" />
      </div>
      <Fit mode={fit}>{children}</Fit>
      <ResizeHandles id={id} />
    </div>
  )
}
