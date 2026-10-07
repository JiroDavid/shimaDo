import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Sticker, StickerPanel } from '../../shared/placement'
import { anchorFor, boxesAsCandidates, elementBoxes, panelSpace, resolveAnchor } from '../lib/anchors'

type Positions = Record<string, { x: number; y: number }>

const same = (a: Positions, b: Positions): boolean => {
  const ak = Object.keys(a)
  if (ak.length !== Object.keys(b).length) return false
  return ak.every((k) => b[k] && a[k].x === b[k].x && a[k].y === b[k].y)
}

export function useAnchors(panel: StickerPanel, stickers: Sticker[]): Positions {
  const [positions, setPositions] = useState<Positions>({})
  const latest = useRef(stickers)
  latest.current = stickers
  const tried = useRef(new Set<string>())

  const recompute = useCallback(() => {
    const space = panelSpace()
    if (!space) return
    const boxes = elementBoxes(panel, space)
    const next: Positions = {}
    const updates: { id: string; anchor: NonNullable<Sticker['anchor']> }[] = []
    for (const s of latest.current) {
      if (s.anchor) {
        const at = resolveAnchor(s.anchor, boxes)
        if (at) next[s.id] = at
        continue
      }
      const key = `${s.id}:${s.x}:${s.y}:${s.size}`
      if (tried.current.has(key)) continue
      tried.current.add(key)
      const anchor = anchorFor(s, boxesAsCandidates(boxes))
      if (anchor) updates.push({ id: s.id, anchor })
    }
    setPositions((prev) => (same(prev, next) ? prev : next))
    if (updates.length > 0) window.shima.editSetAnchors(updates)
  }, [panel])

  useLayoutEffect(recompute)

  useEffect(() => {
    const surface = document.querySelector<HTMLElement>('.panel, .bar')
    if (!surface) return
    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        recompute()
      })
    }
    const body = surface.querySelector<HTMLElement>('.win-body')
    const ro = new ResizeObserver(schedule)
    ro.observe(surface)
    if (body?.firstElementChild) ro.observe(body.firstElementChild)
    const mo = new MutationObserver(schedule)
    mo.observe(body ?? surface, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] })
    body?.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      mo.disconnect()
      body?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [recompute])

  return positions
}
