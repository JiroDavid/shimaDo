import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cropBox, type Sticker } from '../../shared/placement'
import type { AppData } from '../../shared/types'
import { StickerView } from '../components/StickerView'
import { useData } from '../hooks/useData'
import { useEditState } from '../hooks/useEditState'
import { applyTheme } from '../lib/applyTheme'

type Held = 'move' | 'resize' | 'rotate' | 'crop'

function useWindowSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return size
}

export function FloatApp({ id }: { id: string }) {
  const data = useData()
  if (!data) return null
  return <FloatBody id={id} data={data} />
}

function FloatBody({ id, data }: { id: string; data: AppData }) {
  const edit = useEditState()
  const { w, h } = useWindowSize()
  const [preview, setPreview] = useState<Partial<Sticker> | null>(null)
  const [held, setHeld] = useState<Held | null>(null)
  const stored = data.design.stickers.find((s) => s.id === id && s.panel === 'free')
  const ref = `sticker:${id}`
  const cropping = edit.cropping === id
  const selected = edit.active && edit.selected.some((s) => s.id === ref)

  const editRef = useRef(edit)
  editRef.current = edit

  useLayoutEffect(() => {
    applyTheme(data.settings)
  }, [data.settings])

  useEffect(() => window.shima.onFloatPreview((r) => r.id === id && setPreview(r.patch as Partial<Sticker> | null)), [id])

  useLayoutEffect(() => {
    const node = document.querySelector('.sticker')
    if (!node) return
    node.toggleAttribute('data-edit-selected', selected)
    node.toggleAttribute('data-held', held !== null || selected)
  })

  useEffect(() => {
    let drag: { kind: Held; pointer: number } | null = null

    const finish = () => {
      if (!drag) return
      if (drag.kind === 'move') window.shima.floatDragEnd(id)
      else window.shima.floatGestureEnd(id)
      drag = null
      setHeld(null)
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !(e.target instanceof Element)) return
      const node = e.target.closest<HTMLElement>('.sticker')
      if (!node) return
      e.preventDefault()
      node.setPointerCapture(e.pointerId)
      const cropGrip = e.target.closest<HTMLElement>('[data-crop-h]')
      let kind: Held = 'move'
      if (cropGrip) {
        kind = 'crop'
        window.shima.floatGestureBegin(id, 'crop', cropGrip.dataset.cropH ?? '', false)
      } else if (e.target.closest('[data-sticker-rotate]')) {
        kind = 'rotate'
        window.shima.floatGestureBegin(id, 'rotate', '', e.shiftKey)
      } else if (e.target.closest('[data-float-h]')) {
        kind = 'resize'
        window.shima.floatGestureBegin(id, 'resize', '', false)
      } else {
        if (editRef.current.active) {
          const additive = e.ctrlKey || e.metaKey || e.shiftKey
          if (additive || !editRef.current.selected.some((s) => s.id === ref)) window.shima.editSelectRequest({ panel: 'free', ids: [ref], additive })
        }
        window.shima.floatDragBegin(id)
      }
      drag = { kind, pointer: e.pointerId }
      setHeld(kind)
    }

    const onUp = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.pointer) finish()
    }

    const onContext = (e: MouseEvent) => {
      e.preventDefault()
      if (!(e.target instanceof Element) || !e.target.closest('.sticker')) return
      const live = editRef.current
      const already = live.active && live.selected.some((s) => s.id === ref)
      const ids = already ? live.selected.filter((s) => s.panel === 'free').map((s) => s.id) : [ref]
      if (live.active && !already) window.shima.editSelectRequest({ panel: 'free', ids: [ref], additive: false })
      window.shima.editContextMenu('free', ids)
    }

    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointerup', onUp, true)
    document.addEventListener('pointercancel', onUp, true)
    document.addEventListener('contextmenu', onContext, true)
    window.addEventListener('blur', finish)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointerup', onUp, true)
      document.removeEventListener('pointercancel', onUp, true)
      document.removeEventListener('contextmenu', onContext, true)
      window.removeEventListener('blur', finish)
    }
  }, [id, ref])

  if (!stored) return null
  const sticker = { ...stored, ...(preview ?? {}) } as Sticker
  const box = cropBox({ size: sticker.size, crop: cropping ? undefined : sticker.crop })
  const placed = { ...sticker, x: w / 2 - (box.dx + box.width / 2), y: h / 2 - (box.dy + box.height / 2) }
  return (
    <div className="placed-front float-root" aria-hidden="true" style={{ zoom: 1 }}>
      <StickerView sticker={placed} cropping={cropping} variant="float" />
    </div>
  )
}
