import { useEffect } from 'react'
import { GROUPS, GROUP_PREFIX, labelFor } from '../../shared/elements'
import type { PanelId } from '../../shared/types'
import { useEditState } from '../hooks/useEditState'
import { snapshotElement } from '../lib/snapshotElement'

const TARGET = ['[data-el]', ...GROUPS.map((g) => g.selector)].join(',')
const EXEMPT = '[data-edit-exempt], .resize-handle, .dot-btn'
const FOCUSABLE = 'input, textarea, select, button'

function resolve(target: Element): { node: Element; id: string } | null {
  const node = target.closest(TARGET)
  if (!node) return null
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

export function EditLayer({ panel }: { panel: PanelId }) {
  const edit = useEditState()

  useEffect(() => {
    const root = document.documentElement
    if (!edit.active) {
      root.removeAttribute('data-edit')
      clearMarks('data-edit-hover')
      clearMarks('data-edit-selected')
      removeTags()
      return
    }
    root.setAttribute('data-edit', '')
    let hovered: { node: Element; id: string } | null = null
    let selected: { node: Element; id: string } | null = null

    const refresh = () => {
      placeTag('selected', selected?.node ?? null, selected ? labelFor(selected.id) : '')
      const showHover = hovered !== null && hovered.node !== selected?.node
      placeTag('hover', showHover ? hovered!.node : null, showHover ? labelFor(hovered!.id) : '')
    }

    const exempt = (e: Event) => e.target instanceof Element && e.target.closest(EXEMPT) !== null

    const onMove = (e: MouseEvent) => {
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

    const onClick = (e: MouseEvent) => {
      if (exempt(e) || !(e.target instanceof Element)) return
      e.preventDefault()
      e.stopPropagation()
      const hit = resolve(e.target)
      if (!hit) return
      selected = hit
      clearMarks('data-edit-selected', hit.node)
      hit.node.setAttribute('data-edit-selected', '')
      refresh()
      window.shima.editSelect({ id: hit.id, panel, computed: snapshotElement(hit.node) })
    }

    const onMouseDown = (e: MouseEvent) => {
      if (exempt(e) || !(e.target instanceof Element)) return
      if (e.target.closest(FOCUSABLE)) e.preventDefault()
    }

    const onKey = (e: KeyboardEvent) => {
      if (exempt(e) || !(e.target instanceof Element)) return
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('button, [role=checkbox], [role=switch]')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const onSubmit = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const syncSelection = () => {
      if (selected && !document.querySelector('[data-edit-selected]')) selected = null
      refresh()
    }
    const timer = setInterval(syncSelection, 300)

    document.addEventListener('mousemove', onMove, true)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('click', onClick, true)
    document.addEventListener('mousedown', onMouseDown, true)
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('submit', onSubmit, true)
    document.addEventListener('scroll', refresh, true)
    window.addEventListener('resize', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('mousemove', onMove, true)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('submit', onSubmit, true)
      document.removeEventListener('scroll', refresh, true)
      window.removeEventListener('resize', refresh)
      root.removeAttribute('data-edit')
      clearMarks('data-edit-hover')
      clearMarks('data-edit-selected')
      removeTags()
    }
  }, [edit.active, panel])

  useEffect(() => {
    if (edit.selected?.panel !== panel) {
      clearMarks('data-edit-selected')
      document.querySelector<HTMLElement>('.edit-tag[data-kind="selected"]')?.style.setProperty('display', 'none')
    }
  }, [edit.selected, panel])

  return null
}
