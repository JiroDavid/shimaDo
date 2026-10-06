import { ELEMENTS, GROUPS, GROUP_PREFIX } from './elements'
import type { StyleOverride } from './design'
import { parseColor } from './theme'

const colour = (v: unknown): string | null => (parseColor(v) ? (v as string).trim() : null)
const px = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : null

function declarations(o: StyleOverride): string[] {
  const out: string[] = []
  const color = colour(o.color)
  if (color) out.push(`color: ${color} !important`)
  const background = colour(o.background)
  if (background) out.push(`background: ${background} !important`)
  const borderColor = colour(o.borderColor)
  if (borderColor) out.push(`border-color: ${borderColor} !important`)
  const radius = px(o.radius, 0, 999)
  if (radius !== null) out.push(`border-radius: ${radius}px !important`)
  const borderWidth = px(o.borderWidth, 0, 8)
  if (borderWidth !== null) {
    out.push(`border-width: ${borderWidth}px !important`)
    if (borderWidth > 0) out.push('border-style: solid !important')
  }
  const fontSize = px(o.fontSize, 8, 96)
  if (fontSize !== null) out.push(`font-size: ${fontSize}px !important`)
  if (typeof o.bold === 'boolean') out.push(`font-weight: ${o.bold ? 800 : 500} !important`)
  return out
}

export function designCss(overrides: Record<string, StyleOverride>): string {
  const rules: string[] = []
  for (const g of GROUPS) {
    const d = declarations(overrides[GROUP_PREFIX + g.id] ?? {})
    if (d.length > 0) rules.push(`${g.selector} { ${d.join('; ')} }`)
  }
  for (const e of ELEMENTS) {
    const d = declarations(overrides[e.id] ?? {})
    if (d.length > 0) rules.push(`[data-el="${e.id}"] { ${d.join('; ')} }`)
  }
  return rules.join('\n')
}
