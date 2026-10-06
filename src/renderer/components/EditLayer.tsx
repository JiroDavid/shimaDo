import { useContext, useEffect, useRef } from 'react'
import { GROUPS, GROUP_PREFIX, isMovableKey, labelFor } from '../../shared/elements'
import type { StickerPanel } from '../../shared/placement'
import type { PanelId } from '../../shared/types'
import { useEditState } from '../hooks/useEditState'
import { dragOffset, dropPosition, elementScale, exceedsThreshold, nudgeDelta, stickerPosition, stickerResize } from '../lib/dragMove'
import { fileBytes, isImageFile } from '../lib/files'
import { measureScale } from '../lib/measureScale'
import { snapshotElement } from '../lib/snapshotElement'
import { toast } from '../lib/toast'
import { DesignContext } from './EditableText'

const TARGET = ['[data-el]', '.sticker', ...GROUPS.map((g) => g.selector)].join(',')
const EXEMPT = '[data-edit-exempt], .resize-handle, .dot-btn'
const FOCUSABLE = 'input, textarea, select, button'
const ZERO = { color: '', background: '', borderColor: '', radius: 0, borderWidth: 0, fontSize: 0, bold: false }

function resolve(target: Element): { node: Element; id: string } | null {
  const node = target.closest(TARGET)
  if (!node) return null
  const stickerId = (node as HTMLElement).dataset?.sticker
  if (stickerId) return { node, id: `sticker:${stickerId}` }
  const el = node.getAttribute('data-el')
  if (el) return { node, id: el }
  const matching = GROUPS.filter((g) => node.matches(g.selector))
  const group = matching[matching.length - 1]
  return group ? { node, id: GROUP_PREFIX + group.id } : null
}

const clearMarks = (attr: string, keep: Element | null = null) => {
  document.querySelectorAll(`[${attr}]`).forEach((n) => {
    if (n !== keep) n.removeAttribute(attr)
  })
}

type TagKind = 'hover' | 'selected'

function tagElement(kind: TagKind): HTMLElement {
  let tag = document.querySelector<HTMLElement>(`.edit-tag[data-kind="${kind}"]`)
  if (!tag) {
    tag = document.createElement('div')
    tag.className = 'edit-tag'
    tag.dataset.kind = kind
    document.body.appendChild(tag)
  }
  return tag
}

function placeTag(kind: TagKind, node: Element | null, text: string) {
  const tag = tagElement(kind)
  if (!node || !node.isConnected || !text) {
    tag.style.display = 'none'
    return
  }
  const r = node.getBoundingClientRect()
  tag.textContent = text
  tag.style.display = 'block'
  const left = Math.min(Math.max(r.left, 6), Math.max(6, window.innerWidth - tag.offsetWidth - 6))
  const top = r.top - 26 >= 4 ? r.top - 26 : Math.min(r.top + 8, Math.max(4, window.innerHeight - 28))
  tag.style.left = `${left}px`
  tag.style.top = `${top}px`
}

const removeTags = () => document.querySelectorAll('.edit-tag').forEach((t) => t.remove())

const labelOf = (id: string, stickerEmoji?: string) => (id.startsWith('sticker:') ? (stickerEmoji ? `Sticker ${stickerEmoji}` : 'Image sticker') : labelFor(id))

interface Drag {
  kind: 'move' | 'sticker' | 'resize'
  id: string
  node: HTMLElement
  startX: number
  startY: number
  origin: { x: number; y: number }
  size: number
  scale: number
  active: boolean
  last: { x: number; y: number } | number
}

export function EditLayer({ panel }: { panel: PanelId }) {
  const edit = useEditState()
  const design = useContext(DesignContext)
  const designRef = useRef(design)
  designRef.current = design
  const selectedRef = useRef(edit.selected)
  selectedRef.current = edit.selected

  useEffect(() => {
    document.querySelectorAll<HTMLElement>('[data-el]').forEach((n) => n.style.removeProperty('translate'))
  }, [design.moves])

  useEffect(() => {
    const root = document.documentElement
    if (!edit.active) {
      root.removeAttribute('data-edit')
      root.removeAttribute('data-drop')
      clearMarks('data-edit-hover')
      clearMarks('data-edit-selected')
      removeTags()
      return
    }
    root.setAttribute('data-edit', '')
    let hovered: { node: Element; id: string } | null = null
    let selected: { node: Element; id: string } | null = null
    let drag: Drag | null = null
    let suppressClick = false

    const stickerOf = (id: string) => designRef.current.stickers.find((s) => `sticker:${s.id}` === id)
    const nameOf = (hit: { id: string }) => labelOf(hit.id, stickerOf(hit.id)?.emoji)

    const refresh = () => {
      placeTag('selected', selected?.node ?? null, selected ? nameOf(selected) : '')
      const showHover = hovered !== null && hovered.node !== selected?.node
      placeTag('hover', showHover ? hovered!.node : null, showHover ? nameOf(hovered!) : '')
    }

    const exempt = (e: Event) => e.target instanceof Element && e.target.closest(EXEMPT) !== null

    const onMove = (e: MouseEvent) => {
      if (drag?.active) return
      const hit = e.target instanceof Element ? resolve(e.target) : null
      if ((hit?.node ?? null) === (hovered?.node ?? null)) return
      hovered = hit
      clearMarks('data-edit-hover', hit?.node ?? null)
      hit?.node.setAttribute('data-edit-hover', '')
      refresh()
    }

    const onLeave = () => {
      hovered = null
      clearMarks('data-edit-hover')
      refresh()
    }

    const select = (hit: { node: Element; id: string }) => {
      selected = hit
      clearMarks('data-edit-selected', hit.node)
      hit.node.setAttribute('data-edit-selected', '')
      refresh()
      window.shima.editSelect({ id: hit.id, panel, computed: hit.id.startsWith('sticker:') ? ZERO : snapshotElement(hit.node) })
    }

    const onClick = (e: MouseEvent) => {
      if (suppressClick) {
        suppressClick = false
        e.preventDefault()
        e.stopPropagation()
        return
      }
      if (exempt(e) || !(e.target instanceof Element)) return
      e.preventDefault()
      e.stopPropagation()
      const hit = resolve(e.target)
      if (hit) select(hit)
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || exempt(e) || !(e.target instanceof Element)) return
      const handle = e.target.closest('[data-sticker-handle]')
      const hit = resolve(e.target)
      if (!hit) return
      const node = hit.node as HTMLElement
      const base = { id: hit.id, node, startX: e.clientX, startY: e.clientY, active: false }
      if (hit.id.startsWith('sticker:')) {
        const s = stickerOf(hit.id)
        if (!s) return
        const scale = measureScale(node.closest('.placed-front, .placed-back'))
        drag = handle
          ? { ...base, id: s.id, kind: 'resize', origin: { x: s.x, y: s.y }, size: s.size, scale, last: s.size }
          : { ...base, id: s.id, kind: 'sticker', origin: { x: s.x, y: s.y }, size: s.size, scale, last: { x: s.x, y: s.y } }
      } else if (isMovableKey(hit.id)) {
        const origin = designRef.current.moves[hit.id] ?? { x: 0, y: 0 }
        drag = { ...base, kind: 'move', origin, size: 0, scale: elementScale(node.getBoundingClientRect().width, node.offsetWidth), last: origin }
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!drag) return
      const delta = { dx: e.clientX - drag.startX, dy: e.clientY - drag.startY }
      if (!drag.active) {
        if (!exceedsThreshold(delta.dx, delta.dy)) return
        drag.active = true
      }
      if (drag.kind === 'move') {
        const next = dragOffset(drag.origin, delta, drag.scale)
        drag.last = next
        drag.node.style.setProperty('translate', `${next.x}px ${next.y}px`, 'important')
      } else if (drag.kind === 'sticker') {
        const next = stickerPosition(drag.origin, delta, drag.scale)
        drag.last = next
        drag.node.style.left = `${next.x}px`
        drag.node.style.top = `${next.y}px`
      } else {
        const size = stickerResize(drag.size, delta, drag.scale)
        drag.last = size
        drag.node.style.width = `${size}px`
        drag.node.style.height = `${size}px`
      }
      refresh()
    }

    const onPointerUp = () => {
      if (!drag) return
      const done = drag
      drag = null
      if (!done.active) return
      suppressClick = true
      setTimeout(() => {
        suppressClick = false
      }, 0)
      if (done.kind === 'move') {
        const p = done.last as { x: number; y: number }
        window.shima.editMove(done.id, p.x, p.y)
        select({ node: done.node, id: done.id })
      } else if (done.kind === 'sticker') {
        const p = done.last as { x: number; y: number }
        window.shima.editStickerUpdate(done.id, { x: p.x, y: p.y })
        select({ node: done.node, id: `sticker:${done.id}` })
      } else {
        window.shima.editStickerUpdate(done.id, { size: done.last as number })
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      if (exempt(e) || !(e.target instanceof Element)) return
      if (e.target.closest(FOCUSABLE)) e.preventDefault()
    }

    const onKey = (e: KeyboardEvent) => {
      if (exempt(e) || !(e.target instanceof Element)) return
      const nudge = nudgeDelta(e.key, e.shiftKey)
      const sel = selectedRef.current
      if (nudge && sel && sel.panel === panel && !e.target.closest('input, textarea, select')) {
        e.preventDefault()
        e.stopPropagation()
        if (sel.id.startsWith('sticker:')) {
          const s = stickerOf(sel.id)
          if (s) window.shima.editStickerUpdate(s.id, { x: s.x + nudge.x, y: s.y + nudge.y })
        } else if (isMovableKey(sel.id)) {
          const m = designRef.current.moves[sel.id] ?? { x: 0, y: 0 }
          window.shima.editMove(sel.id, m.x + nudge.x, m.y + nudge.y)
        }
        return
      }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('button, [role=checkbox], [role=switch]')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const onSubmit = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      root.setAttribute('data-drop', '')
    }
    const onDragLeave = () => root.removeAttribute('data-drop')
    const onDrop = async (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      root.removeAttribute('data-drop')
      const surface = document.querySelector('.panel, .bar')
      if (!surface) return
      const rect = surface.getBoundingClientRect()
      const scale = measureScale(surface)
      const target = (panel === 'bar' ? 'bar' : panel) as StickerPanel
      let placed = 0
      for (const file of Array.from(e.dataTransfer?.files ?? []).filter(isImageFile).slice(0, 5)) {
        const result = await window.shima.assetAdd(file.name, await fileBytes(file))
        if (!result.ok) {
          toast(result.error)
          continue
        }
        const size = 96
        const { x, y } = dropPosition({ x: e.clientX, y: e.clientY }, rect, size, scale, placed)
        window.shima.editStickerAdd({ panel: target, kind: 'image', asset: result.id, x, y, size, layer: 'front' })
        placed++
      }
    }

    const syncSelection = () => {
      const marked = document.querySelector('[data-edit-selected]')
      if (!marked) selected = null
      else if (selected?.node !== marked) selected = resolve(marked) ?? selected
      refresh()
    }
    const timer = setInterval(syncSelection, 300)

    document.addEventListener('mousemove', onMove, true)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('click', onClick, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointermove', onPointerMove, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('mousedown', onMouseDown, true)
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('submit', onSubmit, true)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('drop', onDrop)
    document.addEventListener('scroll', refresh, true)
    window.addEventListener('resize', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('mousemove', onMove, true)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointermove', onPointerMove, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('submit', onSubmit, true)
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('drop', onDrop)
      document.removeEventListener('scroll', refresh, true)
      window.removeEventListener('resize', refresh)
      root.removeAttribute('data-edit')
      root.removeAttribute('data-drop')
      clearMarks('data-edit-hover')
      clearMarks('data-edit-selected')
      removeTags()
    }
  }, [edit.active, panel])

  useEffect(() => {
    const sel = edit.selected
    if (sel?.panel === panel && sel.id.startsWith('sticker:')) {
      const node = document.querySelector(`.sticker[data-sticker="${CSS.escape(sel.id.slice('sticker:'.length))}"]`)
      if (node) {
        clearMarks('data-edit-selected', node)
        node.setAttribute('data-edit-selected', '')
      }
    } else if (sel?.panel !== panel) {
      clearMarks('data-edit-selected')
      document.querySelector<HTMLElement>('.edit-tag[data-kind="selected"]')?.style.setProperty('display', 'none')
    }
  }, [edit.selected, design.stickers, panel])

  return null
}
