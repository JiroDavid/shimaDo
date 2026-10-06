import { useContext, type CSSProperties } from 'react'
import type { Background } from '../../shared/placement'
import { assetUrl } from '../lib/assetUrl'
import { DesignContext } from './EditableText'
import { StickerView } from './StickerView'

const FIT: Record<string, CSSProperties> = {
  cover: { backgroundSize: 'cover', backgroundRepeat: 'no-repeat' },
  contain: { backgroundSize: 'contain', backgroundRepeat: 'no-repeat' },
  tile: { backgroundSize: 'auto', backgroundRepeat: 'repeat', inset: '-150%' }
}

export const backgroundKey = (panel: string) => (panel === 'bar' ? 'bar.surface' : `${panel}.panel`)

function bgStyle(bg: Background): CSSProperties {
  const move = bg.x || bg.y ? `translate(${bg.x ?? 0}px, ${bg.y ?? 0}px) ` : ''
  const zoom = bg.scale && bg.scale !== 1 ? `scale(${bg.scale})` : ''
  return {
    backgroundImage: `url("${assetUrl(bg.asset)}")`,
    opacity: bg.opacity,
    ...FIT[bg.fit],
    ...(move || zoom ? { transform: `${move}${zoom}`.trim() } : {})
  }
}

export function hasBetween(stickers: { panel: string; layer: string }[], panel: string): boolean {
  return stickers.some((s) => s.panel === panel && s.layer === 'between')
}

export function PlacedLayer({ panel, part }: { panel: string; part: 'back' | 'mid' | 'front' }) {
  const design = useContext(DesignContext)
  const own = design.backgrounds[backgroundKey(panel)]
  const bg = part === 'back' ? (own ?? (panel === 'bar' ? undefined : design.backgrounds['group:panel'])) : undefined
  const layer = part === 'back' ? 'behind' : part === 'mid' ? 'between' : 'front'
  const stickers = design.stickers.filter((s) => s.panel === panel && s.layer === layer)
  if (!bg && stickers.length === 0) return null
  return (
    <div className={`placed-${part}`} aria-hidden="true">
      {bg && <div className="placed-bg" style={bgStyle(bg)} />}
      {stickers.map((s) => (
        <StickerView key={s.id} sticker={s} />
      ))}
    </div>
  )
}
