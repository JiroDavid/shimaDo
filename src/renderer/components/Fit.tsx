import { useLayoutEffect, useRef, type ReactNode } from 'react'

export const FIT_MIN = 0.01
export const FIT_MAX = 40

interface Props {
  mode: 'width' | 'both'
  naturalWidth?: number
  zoom?: number
  children: ReactNode
}

export function Fit({ mode, naturalWidth: baseWidth = 340, zoom = 1, children }: Props) {
  const naturalWidth = baseWidth / zoom
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
    if (mode === 'both') {
      i.classList.add('fit-measure')
      const natural = i.scrollHeight
      i.classList.remove('fit-measure')
      k = Math.min(k, h / Math.max(natural, 1))
    }
    k = Math.min(Math.max(k, FIT_MIN), FIT_MAX)
    i.style.zoom = String(k)
    i.style.width = `${naturalWidth}px`
    i.style.minHeight = `${h / k}px`
    o.closest<HTMLElement>('.panel')?.style.setProperty('--fit', String(k))
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
