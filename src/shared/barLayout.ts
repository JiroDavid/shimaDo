export type BarOrientation = 'horizontal' | 'vertical'

const NATURAL = { horizontal: { w: 740, h: 56 }, vertical: { w: 62, h: 580 } }
const MIN_SCALE = 0.45
const MAX_SCALE = 2.2

export const barOrientation = (width: number, height: number): BarOrientation => (height > width ? 'vertical' : 'horizontal')

export function barScale(width: number, height: number): { orientation: BarOrientation; k: number } {
  const orientation = barOrientation(width, height)
  const n = NATURAL[orientation]
  return { orientation, k: Math.min(Math.max(Math.min(width / n.w, height / n.h), MIN_SCALE), MAX_SCALE) }
}
