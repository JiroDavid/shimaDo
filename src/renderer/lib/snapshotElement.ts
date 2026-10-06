import type { ComputedSnapshot } from '../../shared/design'

const px = (v: string) => Math.round(parseFloat(v) || 0)

export function snapshotElement(el: Element): ComputedSnapshot {
  const cs = getComputedStyle(el)
  return {
    color: cs.color,
    background: cs.backgroundColor,
    borderColor: cs.borderTopColor,
    radius: px(cs.borderTopLeftRadius),
    borderWidth: px(cs.borderTopWidth),
    fontSize: px(cs.fontSize),
    bold: Number(cs.fontWeight) >= 700
  }
}
