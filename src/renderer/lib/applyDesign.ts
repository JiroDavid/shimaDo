import type { Design } from '../../shared/design'
import { allLayerZ } from '../../shared/layers'
import { designCss } from '../../shared/designCss'

const STYLE_ID = 'shimado-design'

export function applyDesign(design: Design, doc: Document = document, dom: Record<string, string[]> = {}): void {
  let el = doc.getElementById(STYLE_ID)
  if (!el) {
    el = doc.createElement('style')
    el.id = STYLE_ID
    doc.head.appendChild(el)
  }
  el.textContent = designCss(design.overrides, design.moves, allLayerZ(design, dom))
}
