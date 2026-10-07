import { CARD_IDS, elementById, isMovableKey } from '../../shared/elements'
import { SURFACE_SUFFIX } from '../../shared/layers'

export function domElementIds(panel: string, doc: Document = document, visibleOnly = false): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  doc.querySelectorAll<HTMLElement>('[data-el]').forEach((n) => {
    const id = n.getAttribute('data-el') ?? ''
    if (seen.has(id) || elementById(id)?.panel !== panel || !isMovableKey(id)) return
    if (visibleOnly && n.getClientRects().length === 0) return
    seen.add(id)
    if (CARD_IDS.includes(id)) out.push(id + SURFACE_SUFFIX)
    out.push(id)
  })
  return out
}
