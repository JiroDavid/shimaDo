import { useContext, useEffect, useRef, type ReactNode } from 'react'
import type { PanelId } from '../../shared/types'
import { isEditablePanel } from '../../shared/elements'
import { Fit } from './Fit'
import { PanelContext } from './PanelContext'
import { DesignContext, EditableText } from './EditableText'
import { PlacedLayer, hasBetween } from './PlacedLayer'
import { ResizeHandles } from './ResizeHandles'

export function PanelFrame({ id, title, fit = 'width', naturalWidth, children }: { id: PanelId; title: string; fit?: 'width' | 'both'; naturalWidth?: number; children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null)
  const between = hasBetween(useContext(DesignContext).stickers, id)
  const editable = isEditablePanel(id)

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
    <div className={`panel panel-enter${between ? ' has-between' : ''}`} ref={frame} data-el={editable ? `${id}.panel` : undefined}>
      {editable && <PlacedLayer panel={id} part="back" />}
      <div className="titlebar flex items-center gap-3 px-5 pb-1 pt-4">
        <button className="dot-btn no-drag" aria-label="Hide panel" onClick={() => window.shima.hidePanel(id)} />
        <span
          className="panel-title heading flex-1 text-center text-[1.05rem] tracking-[0.12em] text-muted"
          data-el={editable ? `${id}.title` : undefined}
        >
          {editable ? <EditableText id={`${id}.title`} fallback={title} /> : title}
        </span>
        <span className="w-4" />
      </div>
      <PanelContext.Provider value={id}>
        <Fit mode={fit} naturalWidth={naturalWidth}>{children}</Fit>
      </PanelContext.Provider>
      {editable && <PlacedLayer panel={id} part="mid" />}
      {editable && <PlacedLayer panel={id} part="front" />}
      <ResizeHandles id={id} />
    </div>
  )
}
