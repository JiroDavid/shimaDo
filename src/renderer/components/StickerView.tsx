import type { Sticker } from '../../shared/placement'
import { assetUrl } from '../lib/assetUrl'

export function StickerView({ sticker: s }: { sticker: Sticker }) {
  return (
    <div className="sticker" data-sticker={s.id} style={{ left: s.x, top: s.y, width: s.size, height: s.size }}>
      {s.kind === 'emoji' ? (
        <span className="sticker-emoji" style={{ fontSize: s.size * 0.8 }}>
          {s.emoji}
        </span>
      ) : (
        <img src={assetUrl(s.asset ?? '')} alt="" draggable={false} />
      )}
      <span className="sticker-handle" data-sticker-handle />
    </div>
  )
}
