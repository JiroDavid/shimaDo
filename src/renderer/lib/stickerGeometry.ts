import { cropBox, type Sticker } from '../../shared/placement'

type Geometry = Pick<Sticker, 'x' | 'y' | 'size' | 'crop'>

export const leftOf = (x: number, dx: number): string => `${x + dx}px`

export function applyStickerGeometry(node: HTMLElement, s: Geometry, cropping = false, emoji = false): void {
  const box = cropBox({ size: s.size, crop: cropping ? undefined : s.crop })
  node.style.left = leftOf(s.x, box.dx)
  node.style.top = leftOf(s.y, box.dy)
  node.style.width = `${box.width}px`
  node.style.height = `${box.height}px`
  const inner = node.querySelector<HTMLElement>('.sticker-inner')
  if (!inner) return
  inner.style.left = `${-box.dx}px`
  inner.style.top = `${-box.dy}px`
  inner.style.width = `${s.size}px`
  inner.style.height = `${s.size}px`
  if (emoji) {
    const glyph = inner.querySelector<HTMLElement>('.sticker-emoji')
    if (glyph) glyph.style.fontSize = `${s.size * 0.8}px`
  }
}
