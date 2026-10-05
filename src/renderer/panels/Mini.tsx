import { useRef } from 'react'

export function Mini() {
  const down = useRef<{ x: number; y: number } | null>(null)

  const finish = (e: React.PointerEvent<HTMLButtonElement>, allowClick: boolean) => {
    window.shima.endMove()
    const start = down.current
    down.current = null
    if (allowClick && start && Math.hypot(e.screenX - start.x, e.screenY - start.y) < 5) window.shima.restoreAll()
  }

  return (
    <button
      className="mini"
      aria-label="Open ShimaDo"
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        down.current = { x: e.screenX, y: e.screenY }
        window.shima.beginMove('mini')
      }}
      onPointerUp={(e) => finish(e, true)}
      onPointerCancel={(e) => finish(e, false)}
    >
      <svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="none" stroke="#F3E9D6" strokeWidth="3" />
        <circle cx="24" cy="24" r="13" fill="var(--accent)" />
      </svg>
    </button>
  )
}
