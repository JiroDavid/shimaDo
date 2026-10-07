import type { ComputedSnapshot } from '../../shared/design'

const px = (v: string) => Math.round(parseFloat(v) || 0)

export function snapshotElement(el: Element): ComputedSnapshot {
  const sheet = (document.getElementById('shimado-design') as HTMLStyleElement | null)?.sheet ?? null
  if (sheet) sheet.disabled = true
  try {
    const cs = getComputedStyle(el)
    const face = el.classList.contains('card') ? getComputedStyle(el, '::before') : cs
    return {
      color: cs.color,
      background: face.backgroundColor,
      borderColor: face.borderTopColor,
      radius: px(cs.borderTopLeftRadius),
      borderWidth: px(face.borderTopWidth),
      fontSize: px(cs.fontSize),
      bold: Number(cs.fontWeight) >= 700
    }
  } finally {
    if (sheet) sheet.disabled = false
  }
}
