import { useEffect } from 'react'
import { GROUPS, GROUP_PREFIX } from '../../shared/elements'
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

export function EditLayer({ panel }: { panel: PanelId }) {
  const edit = useEditState()

  useEffect(() => {
    const root = document.documentElement
    if (!edit.active) {
      root.removeAttribute('data-edit')
      clearMarks('data-edit-hover')
      clearMarks('data-edit-selected')
      return
    }
    root.setAttribute('data-edit', '')
    let hovered: Element | null = null

    const exempt = (e: Event) => e.target instanceof Element && e.target.closest(EXEMPT) !== null

    const onMove = (e: MouseEvent) => {
      const hit = e.target instanceof Element ? resolve(e.target) : null
      const node = hit?.node ?? null
      if (node === hovered) return
      hovered = node
      clearMarks('data-edit-hover', node)
      node?.setAttribute('data-edit-hover', '')
    }

    const onClick = (e: MouseEvent) => {
      if (exempt(e) || !(e.target instanceof Element)) return
      e.preventDefault()
      e.stopPropagation()
      const hit = resolve(e.target)
      if (!hit) return
      clearMarks('data-edit-selected', hit.node)
      hit.node.setAttribute('data-edit-selected', '')
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

    document.addEventListener('mousemove', onMove, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('mousedown', onMouseDown, true)
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('submit', onSubmit, true)
    return () => {
      document.removeEventListener('mousemove', onMove, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('submit', onSubmit, true)
      root.removeAttribute('data-edit')
      clearMarks('data-edit-hover')
      clearMarks('data-edit-selected')
    }
  }, [edit.active, panel])

  useEffect(() => {
    if (edit.selected?.panel !== panel) clearMarks('data-edit-selected')
  }, [edit.selected, panel])

  return null
}
