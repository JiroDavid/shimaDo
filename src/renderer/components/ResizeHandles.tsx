import type { CSSProperties } from 'react'
import type { Edge, PanelId } from '../../shared/types'

const CURSORS: Record<Edge, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  w: 'ew-resize',
  e: 'ew-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize'
}

function layout(edge: Edge, e: number, c: number): CSSProperties {
  switch (edge) {
    case 'n':
      return { top: 0, left: c, right: c, height: e }
    case 's':
      return { bottom: 0, left: c, right: c, height: e }
    case 'w':
      return { left: 0, top: c, bottom: c, width: e }
    case 'e':
      return { right: 0, top: c, bottom: c, width: e }
    case 'nw':
      return { top: 0, left: 0, width: c, height: c }
    case 'ne':
      return { top: 0, right: 0, width: c, height: c }
    case 'sw':
      return { bottom: 0, left: 0, width: c, height: c }
    case 'se':
      return { bottom: 0, right: 0, width: c, height: c }
  }
}

export function ResizeHandles({ id, edge = 8, corner = 20 }: { id: PanelId; edge?: number; corner?: number }) {
  const begin = (which: Edge) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    window.shima.beginResize(id, which)
  }
  const end = () => window.shima.endResize()

  return (
    <>
      {(Object.keys(CURSORS) as Edge[]).map((which) => (
        <div
          key={which}
          className="resize-handle"
          style={{ ...layout(which, edge, corner), cursor: CURSORS[which] }}
          onPointerDown={begin(which)}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={end}
        />
      ))}
    </>
  )
}
