import { useContext, useEffect, useRef } from 'react'
import { GROUPS, GROUP_PREFIX, elementById, isMovableKey, labelFor } from '../../shared/elements'
import type { SelectedElement } from '../../shared/design'
import { MAX_CROP, normaliseRotation, type Crop, type StickerPanel } from '../../shared/placement'
import type { PanelId } from '../../shared/types'
import { useEditState } from '../hooks/useEditState'
import { dragOffset, elementScale, exceedsThreshold, nudgeDelta, stickerPosition, stickerResize } from '../lib/dragMove'
import { fileBytes, isImageFile } from '../lib/files'
import { layerBase } from '../../shared/layers'
import { domElementIds } from '../lib/domElements'
import { measureScale } from '../lib/measureScale'
import { anchorFor, boxesAsCandidates, elementBoxes, panelSpace } from '../lib/anchors'
import { applyStickerGeometry } from '../lib/stickerGeometry'
import { boxLines, snapDelta, type Box, type Lines } from '../lib/snap'
import { snapshotElement } from '../lib/snapshotElement'
import { toast } from '../lib/toast'
import { DesignContext } from './EditableText'

const TARGET = ['[data-el]', '.sticker', ...GROUPS.map((g) => g.selector)].join(',')
const EXEMPT = '[data-edit-exempt], .dot-btn'
const FOCUSABLE = 'input, textarea, select, button'
const ZERO = { color: '', background: '', borderColor: '', radius: 0, borderWidth: 0, fontSize: 0, bold: false }

function resolve(target: Element, point?: { x: number; y: number }): { node: Element; id: string } | null {
  let node = target.closest('.resize-handle') ? document.querySelector('.panel, .bar') : target.closest(TARGET)
  const surface = node?.getAttribute('data-el')
  if (point && (!node || surface === 'bar.surface' || surface?.endsWith('.panel'))) {
    const under = document.elementsFromPoint(point.x, point.y).find((n) => n.classList.contains('sticker'))
    if (under) node = under
  }
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

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const

function placeBox(node: Element | null, handles = false) {
  let box = document.querySelector<HTMLElement>('.edit-box')
  if (!box) {
    box = document.createElement('div')
    box.className = 'edit-box'
    for (const h of HANDLES) {
      const dot = document.createElement('span')
      dot.className = 'edit-handle'
      dot.dataset.h = h
      box.appendChild(dot)
    }
    document.body.appendChild(box)
  }
  box.dataset.handles = handles ? 'on' : 'off'
  if (!node || !node.isConnected) {
    box.style.display = 'none'
    return
  }
  const r = node.getBoundingClientRect()
  box.style.display = 'block'
  box.style.left = `${r.left}px`
  box.style.top = `${r.top}px`
  box.style.width = `${r.width}px`
  box.style.height = `${r.height}px`
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

function collectTargets(dragged: Element, surface: Element): Lines {
  const xs: number[] = []
  const ys: number[] = []
  const add = (r: DOMRect) => {
    const l = boxLines(r)
    xs.push(...l.xs)
    ys.push(...l.ys)
  }
  add(surface.getBoundingClientRect())
  document.querySelectorAll('[data-el], .sticker').forEach((n) => {
    if (n === surface || n === dragged || dragged.contains(n) || n.contains(dragged)) return
    const r = n.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) add(r)
  })
  return { xs, ys }
}

function showGuides(surface: Element | null, guideX: number | null, guideY: number | null) {
  const lines: { axis: 'x' | 'y'; at: number | null }[] = [
    { axis: 'x', at: guideX },
    { axis: 'y', at: guideY }
  ]
  for (const { axis, at } of lines) {
    let el = document.querySelector<HTMLElement>(`.snap-guide[data-axis="${axis}"]`)
    if (at === null || !surface) {
      if (el) el.style.display = 'none'
      continue
    }
    if (!el) {
      el = document.createElement('div')
      el.className = 'snap-guide'
      el.dataset.axis = axis
      document.body.appendChild(el)
    }
    const r = surface.getBoundingClientRect()
    el.style.display = 'block'
    if (axis === 'x') Object.assign(el.style, { left: `${at}px`, top: `${r.top}px`, width: '1px', height: `${r.height}px` })
    else Object.assign(el.style, { left: `${r.left}px`, top: `${at}px`, width: `${r.width}px`, height: '1px' })
  }
}

const removeGuides = () => document.querySelectorAll('.snap-guide').forEach((g) => g.remove())

interface Hit {
  node: Element
  id: string
}

interface Drag {
  kind: 'move' | 'sticker' | 'resize' | 'resizeEl' | 'rotate' | 'crop'
  handle?: string
  crop0?: Crop
  cropNow?: Crop
  angle0?: number
  rot0?: number
  center?: { x: number; y: number }
  w0?: number
  h0?: number
  id: string
  node: HTMLElement
  startX: number
  startY: number
  origin: { x: number; y: number }
  size: number
  scale: number
  active: boolean
  last: { x: number; y: number } | number
  startBox: Box
  surface: Element | null
  targets: Lines | null
}

const touched: { node: HTMLElement; width: string; minHeight: string; height: string; translate: string }[] = []

const shownAt = (node: Element, fallback: { x: number; y: number }): { x: number; y: number } => {
  const x = Number((node as HTMLElement).dataset.rx)
  const y = Number((node as HTMLElement).dataset.ry)
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : fallback
}

export function EditLayer({ panel }: { panel: PanelId }) {
  const edit = useEditState()
  const design = useContext(DesignContext)
  const designRef = useRef(design)
  designRef.current = design
  const selectedRef = useRef(edit.selected)
  selectedRef.current = edit.selected
  const croppingRef = useRef(edit.cropping)
  croppingRef.current = edit.cropping

  useEffect(() => {
    document.querySelectorAll<HTMLElement>('[data-el]').forEach((n) => n.style.removeProperty('translate'))
    for (const t of touched.splice(0)) {
      t.node.style.width = t.width
      t.node.style.minHeight = t.minHeight
      t.node.style.height = t.height
      t.node.style.removeProperty('box-sizing')
    }
  }, [design.moves, design.overrides])

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
    let hovered: Hit | null = null
    let selection: Hit[] = []
    let drag: Drag | null = null
    let suppressClick = false

    const stickerOf = (id: string) => designRef.current.stickers.find((s) => `sticker:${s.id}` === id)
    const nameOf = (hit: { id: string }) => labelOf(hit.id, stickerOf(hit.id)?.emoji)
    const primary = () => selection[selection.length - 1] ?? null

    const refresh = () => {
      const p = primary()
      placeTag('selected', p?.node ?? null, p ? nameOf(p) : '')
      const resizable = selection.length === 1 && p !== null && !p.id.startsWith('sticker:') && !p.id.startsWith('group:') && (elementById(p.id)?.props.includes('size') ?? false)
      placeBox(selection.length === 1 && p?.node.classList.contains('sticker') ? p.node : resizable ? p!.node : null, resizable)
      const showHover = hovered !== null && !selection.some((s) => s.node === hovered!.node)
      placeTag('hover', showHover ? hovered!.node : null, showHover ? nameOf(hovered!) : '')
    }

    const exempt = (e: Event) => e.target instanceof Element && e.target.closest(EXEMPT) !== null
    const onEdgeHandle = (e: Event) => e.target instanceof Element && e.target.closest('.resize-handle') !== null

    const onMove = (e: MouseEvent) => {
      if (drag?.active) return
      const hit = e.target instanceof Element ? resolve(e.target, { x: e.clientX, y: e.clientY }) : null
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

    const publish = () => {
      const items: SelectedElement[] = selection.map((h) => ({
        id: h.id,
        panel,
        computed: h.id.startsWith('sticker:') ? ZERO : snapshotElement(h.node)
      }))
      window.shima.editSelect(items)
    }

    const applySelection = (hits: Hit[]) => {
      selection = hits
      clearMarks('data-edit-selected')
      hits.forEach((h) => h.node.setAttribute('data-edit-selected', ''))
      refresh()
      publish()
    }

    const findHit = (id: string): Hit | null => {
      const node = id.startsWith('sticker:')
        ? document.querySelector(`.sticker[data-sticker="${CSS.escape(id.slice('sticker:'.length))}"]`)
        : document.querySelector(`[data-el="${CSS.escape(layerBase(id))}"]`)
      return node ? { node, id: layerBase(id) } : null
    }

    const toggle = (hit: Hit): Hit[] => (selection.some((s) => s.id === hit.id) ? selection.filter((s) => s.id !== hit.id) : [...selection, hit])
    const additive = (e: MouseEvent | PointerEvent) => e.ctrlKey || e.metaKey || e.shiftKey

    const moveSticker = (stickerId: string, x: number, y: number) => {
      const s = stickerOf(`sticker:${stickerId}`)
      if (!s) return
      const space = panelSpace()
      const anchor = space ? anchorFor({ ...s, x, y }, boxesAsCandidates(elementBoxes(panel as StickerPanel, space))) : null
      window.shima.editStickerUpdate(stickerId, { x, y, anchor })
    }

    const covering = (e: MouseEvent | PointerEvent, natural: Hit | null): Hit | null => {
      if (additive(e)) return null
      for (let i = selection.length - 1; i >= 0; i--) {
        const s = selection[i]
        if (!s.node.isConnected) continue
        const r = s.node.getBoundingClientRect()
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) continue
        if (natural && (natural.node === s.node || s.node.contains(natural.node))) return null
        return s
      }
      return null
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
      const hit = resolve(e.target, { x: e.clientX, y: e.clientY })
      if (covering(e, hit)) return
      if (!hit) return
      applySelection(additive(e) ? toggle(hit) : [hit])
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || !(e.target instanceof Element)) return
      const grip = e.target.closest<HTMLElement>('.edit-handle')
      const only = selection.length === 1 ? selection[0] : null
      if (grip && only && !only.id.startsWith('sticker:')) {
        e.preventDefault()
        e.stopPropagation()
        const node = only.node as HTMLElement
        const r = node.getBoundingClientRect()
        const origin = designRef.current.moves[only.id] ?? { x: 0, y: 0 }
        touched.push({ node, width: node.style.width, minHeight: node.style.minHeight, height: node.style.height, translate: node.style.translate })
        drag = {
          kind: 'resizeEl',
          handle: grip.dataset.h,
          id: only.id,
          node,
          startX: e.clientX,
          startY: e.clientY,
          active: true,
          origin,
          size: 0,
          scale: elementScale(r.width, node.offsetWidth),
          last: origin,
          w0: node.offsetWidth,
          h0: node.offsetHeight,
          startBox: { left: r.left, top: r.top, width: r.width, height: r.height },
          surface: null,
          targets: null
        }
        return
      }
      if (exempt(e) || onEdgeHandle(e)) return
      const cropGrip = e.target.closest<HTMLElement>('[data-crop-h]')
      const cropNode = cropGrip?.closest<HTMLElement>('.sticker')
      const cropSticker = cropNode?.dataset.sticker ? stickerOf(`sticker:${cropNode.dataset.sticker}`) : undefined
      if (cropGrip && cropNode && cropSticker) {
        e.preventDefault()
        e.stopPropagation()
        const r = cropNode.getBoundingClientRect()
        const c0 = cropSticker.crop ?? { l: 0, t: 0, r: 0, b: 0 }
        drag = {
          kind: 'crop',
          handle: cropGrip.dataset.cropH,
          id: cropSticker.id,
          node: cropNode,
          startX: e.clientX,
          startY: e.clientY,
          active: true,
          origin: { x: cropSticker.x, y: cropSticker.y },
          size: cropSticker.size,
          scale: measureScale(cropNode.closest('.placed-front, .placed-back, .placed-under')),
          last: 0,
          crop0: c0,
          cropNow: c0,
          angle0: cropSticker.rotation ?? 0,
          startBox: { left: r.left, top: r.top, width: r.width, height: r.height },
          surface: null,
          targets: null
        }
        return
      }
      if (croppingRef.current && !e.target.closest('.sticker[data-cropping]')) window.shima.editCropMode(null)
      const natural = resolve(e.target, { x: e.clientX, y: e.clientY })
      const grabbed = covering(e, natural)
      const handle = grabbed ? null : e.target.closest('[data-sticker-handle]')
      const rotateGrip = grabbed ? null : e.target.closest('[data-sticker-rotate]')
      const hit = grabbed ?? natural
      if (!hit) return
      const node = hit.node as HTMLElement
      const surface = document.querySelector('.panel, .bar')
      const r = node.getBoundingClientRect()
      const base = {
        id: hit.id,
        node,
        startX: e.clientX,
        startY: e.clientY,
        active: false,
        startBox: { left: r.left, top: r.top, width: r.width, height: r.height },
        surface,
        targets: null
      }
      if (hit.id.startsWith('sticker:')) {
        const s = stickerOf(hit.id)
        if (!s) return
        const scale = measureScale(node.closest('.placed-front, .placed-back, .placed-under'))
        const cx = base.startBox.left + base.startBox.width / 2
        const cy = base.startBox.top + base.startBox.height / 2
        drag = rotateGrip
          ? {
              ...base,
              id: s.id,
              kind: 'rotate',
              origin: shownAt(node, { x: s.x, y: s.y }),
              size: s.size,
              scale,
              last: s.rotation ?? 0,
              rot0: s.rotation ?? 0,
              angle0: (Math.atan2(e.clientX - cx, -(e.clientY - cy)) * 180) / Math.PI,
              center: { x: cx, y: cy }
            }
          : handle
          ? { ...base, id: s.id, kind: 'resize', origin: shownAt(node, { x: s.x, y: s.y }), size: s.size, scale, last: s.size }
          : { ...base, id: s.id, kind: 'sticker', origin: shownAt(node, { x: s.x, y: s.y }), size: s.size, scale, last: shownAt(node, { x: s.x, y: s.y }) }
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
      if (drag.kind === 'crop') {
        const c0 = drag.crop0 as Crop
        const rad = (-(drag.angle0 ?? 0) * Math.PI) / 180
        const rx = delta.dx * Math.cos(rad) - delta.dy * Math.sin(rad)
        const ry = delta.dx * Math.sin(rad) + delta.dy * Math.cos(rad)
        const fx = rx / drag.scale / drag.size
        const fy = ry / drag.scale / drag.size
        const h = drag.handle ?? ''
        const clamp = (v: number, hi: number) => Math.round(Math.min(hi, Math.max(0, v)) * 1000) / 1000
        const next = { ...c0 }
        if (h.includes('w')) next.l = clamp(c0.l + fx, MAX_CROP - c0.r)
        if (h.includes('e')) next.r = clamp(c0.r - fx, MAX_CROP - c0.l)
        if (h.includes('n')) next.t = clamp(c0.t + fy, MAX_CROP - c0.b)
        if (h.includes('s')) next.b = clamp(c0.b - fy, MAX_CROP - c0.t)
        drag.cropNow = next
        window.shima.editStickerUpdate(drag.id, { crop: next })
        return
      }
      if (drag.kind === 'rotate') {
        const c = drag.center as { x: number; y: number }
        const angle = (Math.atan2(e.clientX - c.x, -(e.clientY - c.y)) * 180) / Math.PI
        let deg = (drag.rot0 ?? 0) + (angle - (drag.angle0 ?? 0))
        if (e.shiftKey) deg = Math.round(deg / 15) * 15
        else {
          const near = Math.round(deg / 90) * 90
          if (Math.abs(deg - near) < 4) deg = near
        }
        deg = normaliseRotation(deg)
        drag.last = deg
        drag.node.style.transform = `rotate(${deg}deg)`
        placeTag('selected', drag.node, `${deg}°`)
        return
      }
      if (drag.kind === 'resizeEl') {
        const s = drag.scale > 0 ? drag.scale : 1
        const dx = delta.dx / s
        const dy = delta.dy / s
        const h = drag.handle ?? ''
        const clamp = (v: number) => Math.min(2000, Math.max(24, Math.round(v)))
        let w = drag.w0 ?? 0
        let ht = drag.h0 ?? 0
        let mx = drag.origin.x
        let my = drag.origin.y
        if (h.includes('e')) w = clamp((drag.w0 ?? 0) + dx)
        if (h.includes('w')) {
          w = clamp((drag.w0 ?? 0) - dx)
          mx = Math.round(drag.origin.x + ((drag.w0 ?? 0) - w))
        }
        if (h.includes('s')) ht = clamp((drag.h0 ?? 0) + dy)
        if (h.includes('n')) {
          ht = clamp((drag.h0 ?? 0) - dy)
          my = Math.round(drag.origin.y + ((drag.h0 ?? 0) - ht))
        }
        drag.last = { x: mx, y: my }
        drag.size = w
        drag.node.dataset.liveH = String(ht)
        drag.node.style.setProperty('box-sizing', 'border-box', 'important')
        if (h.includes('e') || h.includes('w')) drag.node.style.setProperty('width', `${w}px`, 'important')
        if (h.includes('s') || h.includes('n')) {
          if (drag.node.classList.contains('card')) {
            drag.node.style.setProperty('height', `${ht}px`, 'important')
            drag.node.style.setProperty('min-height', '0', 'important')
          } else drag.node.style.setProperty('min-height', `${ht}px`, 'important')
        }
        drag.node.style.setProperty('translate', `${mx}px ${my}px`, 'important')
        refresh()
        return
      }
      if (drag.kind !== 'resize') {
        if (e.ctrlKey || e.metaKey || !drag.surface) {
          showGuides(null, null, null)
        } else {
          drag.targets ??= collectTargets(drag.node, drag.surface)
          const snap = snapDelta(drag.startBox, delta, drag.targets)
          delta.dx = snap.dx
          delta.dy = snap.dy
          showGuides(drag.surface, snap.guideX, snap.guideY)
        }
      }
      if (drag.kind === 'move') {
        const next = dragOffset(drag.origin, delta, drag.scale)
        drag.last = next
        drag.node.style.setProperty('translate', `${next.x}px ${next.y}px`, 'important')
      } else if (drag.kind === 'sticker') {
        const next = stickerPosition(drag.origin, delta, drag.scale)
        drag.last = next
        const s = stickerOf(`sticker:${drag.id}`)
        if (s) applyStickerGeometry(drag.node, { ...s, x: next.x, y: next.y }, drag.node.hasAttribute('data-cropping'))
      } else {
        const size = stickerResize(drag.size, delta, drag.scale)
        drag.last = size
        const s = stickerOf(`sticker:${drag.id}`)
        if (s) applyStickerGeometry(drag.node, { ...s, x: drag.origin.x, y: drag.origin.y, size }, drag.node.hasAttribute('data-cropping'), s.kind === 'emoji')
      }
      refresh()
    }

    const onPointerUp = () => {
      if (!drag) return
      const done = drag
      drag = null
      removeGuides()
      if (done.kind === 'crop') return
      if (done.kind === 'rotate') {
        window.shima.editStickerUpdate(done.id, { rotation: done.last as number })
        suppressClick = true
        setTimeout(() => {
          suppressClick = false
        }, 0)
        return
      }
      if (done.kind === 'resizeEl') {
        const p = done.last as { x: number; y: number }
        const h = done.handle ?? ''
        const live = Number(done.node.dataset.liveH)
        delete done.node.dataset.liveH
        const width = h.includes('e') || h.includes('w') ? done.size : null
        const height = h.includes('s') || h.includes('n') ? live : null
        window.shima.editResizeElement(done.id, width, height, p.x, p.y)
        suppressClick = true
        setTimeout(() => {
          suppressClick = false
        }, 0)
        return
      }
      if (!done.active) return
      suppressClick = true
      setTimeout(() => {
        suppressClick = false
      }, 0)
      const ref = done.kind === 'move' ? done.id : `sticker:${done.id}`
      const keep = selection.some((s) => s.id === ref)
      if (done.kind === 'move') {
        const p = done.last as { x: number; y: number }
        window.shima.editMove(done.id, p.x, p.y)
      } else if (done.kind === 'sticker') {
        const p = done.last as { x: number; y: number }
        moveSticker(done.id, p.x, p.y)
      } else {
        window.shima.editStickerUpdate(done.id, { size: done.last as number })
        return
      }
      if (!keep) applySelection([{ node: done.node, id: ref }])
    }

    const onMouseDown = (e: MouseEvent) => {
      if (exempt(e) || !(e.target instanceof Element)) return
      if (e.target.closest(FOCUSABLE)) e.preventDefault()
    }

    const onKey = (e: KeyboardEvent) => {
      if (exempt(e) || !(e.target instanceof Element)) return
      if ((e.key === 'Escape' || e.key === 'Enter') && croppingRef.current && !e.target.closest('input, textarea, select')) {
        e.preventDefault()
        e.stopPropagation()
        window.shima.editCropMode(null)
        return
      }
      if (e.key === 'Escape' && !e.target.closest('input, textarea, select') && selection.length > 0) {
        e.preventDefault()
        e.stopPropagation()
        applySelection([])
        return
      }
      const nudge = nudgeDelta(e.key, e.shiftKey)
      const mine = selectedRef.current.filter((s) => s.panel === panel)
      if (nudge && mine.length > 0 && !e.target.closest('input, textarea, select')) {
        e.preventDefault()
        e.stopPropagation()
        for (const sel of mine) {
          if (sel.id.startsWith('sticker:')) {
            const s = stickerOf(sel.id)
            const shown = s ? shownAt(document.querySelector(`.sticker[data-sticker="${CSS.escape(s.id)}"]`) ?? document.body, { x: s.x, y: s.y }) : null
            if (s && shown) moveSticker(s.id, shown.x + nudge.x, shown.y + nudge.y)
          } else if (isMovableKey(sel.id)) {
            const m = designRef.current.moves[sel.id] ?? { x: 0, y: 0 }
            window.shima.editMove(sel.id, m.x + nudge.x, m.y + nudge.y)
          }
        }
        return
      }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('button, [role=checkbox], [role=switch]')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const onContext = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!(e.target instanceof Element) || e.target.closest(EXEMPT)) return
      const natural = resolve(e.target, { x: e.clientX, y: e.clientY })
      const hit = covering(e, natural) ?? natural
      if (!hit) return
      if (!selection.some((s) => s.id === hit.id)) applySelection([hit])
      window.shima.editContextMenu(panel, selection.map((s) => s.id))
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
      let placed = 0
      for (const file of Array.from(e.dataTransfer?.files ?? []).filter(isImageFile).slice(0, 5)) {
        const result = await window.shima.assetAdd(file.name, await fileBytes(file))
        if (!result.ok) {
          toast(result.error)
          continue
        }
        const size = 160
        window.shima.editStickerAdd({ panel: 'free', kind: 'image', asset: result.id, x: Math.round(e.screenX - size / 2 + placed * 28), y: Math.round(e.screenY - size / 2 + placed * 28), size, layer: 'front' })
        placed++
      }
    }

    const offSelect = window.shima.onSelectRequest((r) => {
      if (r.panel !== panel) return
      const hits = r.ids.map(findHit).filter((h): h is Hit => h !== null)
      if (!r.additive) return applySelection(hits)
      let next = selection
      for (const h of hits) next = next.some((s) => s.id === h.id) ? next.filter((s) => s.id !== h.id) : [...next, h]
      applySelection(next)
    })

    const offHover = window.shima.onHover((r) => {
      if (r.panel !== panel) return
      const hit = r.id ? findHit(r.id) : null
      hovered = hit
      clearMarks('data-edit-hover', hit?.node ?? null)
      hit?.node.setAttribute('data-edit-hover', '')
      refresh()
    })

    let lastDom = ''
    const reportDom = () => {
      const ids = domElementIds(panel, document, true)
      const key = ids.join('|')
      if (key === lastDom) return
      lastDom = key
      window.shima.editReportDom(panel, ids)
    }

    const syncSelection = () => {
      const marked = Array.from(document.querySelectorAll('[data-edit-selected]'))
      selection = marked.map((n) => resolve(n)).filter((h): h is Hit => h !== null)
      refresh()
      reportDom()
    }
    reportDom()
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
    document.addEventListener('contextmenu', onContext, true)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('drop', onDrop)
    document.addEventListener('scroll', refresh, true)
    window.addEventListener('resize', refresh)
    return () => {
      clearInterval(timer)
      offSelect()
      offHover()
      document.removeEventListener('mousemove', onMove, true)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointermove', onPointerMove, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('submit', onSubmit, true)
      document.removeEventListener('contextmenu', onContext, true)
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
      removeGuides()
    }
  }, [edit.active, panel])

  useEffect(() => {
    if (!edit.active) return
    const mine = edit.selected.filter((s) => s.panel === panel)
    const wanted = new Set<Element>()
    for (const s of mine) {
      const node = s.id.startsWith('sticker:')
        ? document.querySelector(`.sticker[data-sticker="${CSS.escape(s.id.slice('sticker:'.length))}"]`)
        : s.id.startsWith('group:')
          ? null
          : document.querySelector(`[data-el="${CSS.escape(s.id)}"]`)
      if (node) wanted.add(node)
    }
    if (mine.some((s) => s.id.startsWith('group:'))) return
    document.querySelectorAll('[data-edit-selected]').forEach((n) => {
      if (!wanted.has(n)) n.removeAttribute('data-edit-selected')
    })
    wanted.forEach((n) => n.setAttribute('data-edit-selected', ''))
    if (mine.length === 0) document.querySelector<HTMLElement>('.edit-tag[data-kind="selected"]')?.style.setProperty('display', 'none')
  }, [edit.selected, edit.active, design.stickers, panel])

  return null
}
