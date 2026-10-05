import { useLayoutEffect, useRef, type ReactNode } from 'react'

interface Props {
  mode: 'width' | 'both'
  naturalWidth?: number
  children: ReactNode
}

export function Fit({ mode, naturalWidth = 340, children }: Props) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)

  const apply = () => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return
    const cs = getComputedStyle(o)
    const w = o.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const h = o.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    if (w <= 0 || h <= 0) return
    i.style.zoom = '1'
    i.style.minHeight = '0'
    i.style.width = `${naturalWidth}px`
    let k = w / naturalWidth
    if (mode === 'both') k = Math.min(k, h / Math.max(i.scrollHeight, 1))
    k = Math.min(Math.max(k, 0.35), 1)
    i.style.zoom = String(k)
    i.style.width = `${w / k}px`
    i.style.minHeight = `${h / k}px`
  }

  useLayoutEffect(apply)

  useLayoutEffect(() => {
    const o = outer.current
    if (!o) return
    const ro = new ResizeObserver(apply)
    ro.observe(o)
    return () => ro.disconnect()
  }, [mode, naturalWidth])

  return (
    <div className="win-body" data-fit={mode} ref={outer}>
      <div ref={inner}>{children}</div>
    </div>
  )
}
