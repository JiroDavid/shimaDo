import { useContext, type CSSProperties } from 'react'
import { assetUrl } from '../lib/assetUrl'
import { DesignContext } from './EditableText'
import { StickerView } from './StickerView'

const FIT: Record<string, CSSProperties> = {
  cover: { backgroundSize: 'cover', backgroundRepeat: 'no-repeat' },
  contain: { backgroundSize: 'contain', backgroundRepeat: 'no-repeat' },
  tile: { backgroundSize: 'auto', backgroundRepeat: 'repeat' }
}

export function PlacedLayer({ panel, part }: { panel: string; part: 'back' | 'front' }) {
  const design = useContext(DesignContext)
  const own = design.backgrounds[panel === 'bar' ? 'bar.surface' : `${panel}.panel`]
  const bg = part === 'back' ? (own ?? (panel === 'bar' ? undefined : design.backgrounds['group:panel'])) : undefined
  const layer = part === 'back' ? 'behind' : 'front'
  const stickers = design.stickers.filter((s) => s.panel === panel && s.layer === layer)
  if (!bg && stickers.length === 0) return null
  return (
    <div className={`placed-${part}`} aria-hidden="true">
      {bg && <div className="placed-bg" style={{ backgroundImage: `url("${assetUrl(bg.asset)}")`, opacity: bg.opacity, ...FIT[bg.fit] }} />}
      {stickers.map((s) => (
        <StickerView key={s.id} sticker={s} />
      ))}
    </div>
  )
}
