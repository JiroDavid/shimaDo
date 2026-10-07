import type { CSSProperties } from 'react'
import { cropBox, type Sticker } from '../../shared/placement'
import { assetUrl } from '../lib/assetUrl'
import { leftOf } from '../lib/stickerGeometry'

const CROP_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const

const FLOAT_CORNERS = ['nw', 'ne', 'sw', 'se'] as const

export function StickerView({ sticker: s, cropping = false, variant = 'panel' }: { sticker: Sticker; cropping?: boolean; variant?: 'panel' | 'float' }) {
  const box = cropBox({ size: s.size, crop: cropping ? undefined : s.crop })
  const frame = s.crop ?? { l: 0, t: 0, r: 0, b: 0 }
  const outer: CSSProperties = {
    left: leftOf(s.x, box.dx),
    top: leftOf(s.y, box.dy),
    width: box.width,
    height: box.height,
    ...(s.rotation ? { transform: `rotate(${s.rotation}deg)` } : {})
  }
  const flips = cropping ? '' : `${s.flipX ? 'scaleX(-1) ' : ''}${s.flipY ? 'scaleY(-1)' : ''}`.trim()
  const clip: CSSProperties = {
    ...(s.opacity !== undefined ? { opacity: s.opacity } : {}),
    ...(s.round ? { borderRadius: `${s.round}%` } : {}),
    ...(flips ? { transform: flips } : {})
  }
  return (
    <div className="sticker" data-sticker={s.id} data-rx={s.x} data-ry={s.y} data-cropping={cropping ? '' : undefined} style={outer}>
      <div className="sticker-clip" style={clip}>
        <div className="sticker-inner" style={{ left: -box.dx, top: -box.dy, width: s.size, height: s.size }}>
          {s.kind === 'emoji' ? (
            <span className="sticker-emoji" style={{ fontSize: s.size * 0.8 }}>
              {s.emoji}
            </span>
          ) : (
            <img src={assetUrl(s.asset ?? '')} alt="" draggable={false} />
          )}
        </div>
        {cropping && (
          <div
            className="crop-shade"
            style={{ left: `${frame.l * 100}%`, top: `${frame.t * 100}%`, right: `${frame.r * 100}%`, bottom: `${frame.b * 100}%` }}
          />
        )}
      </div>
      {cropping && (
        <div className="crop-frame" style={{ left: `${frame.l * 100}%`, top: `${frame.t * 100}%`, right: `${frame.r * 100}%`, bottom: `${frame.b * 100}%` }}>
          {CROP_HANDLES.map((h) => (
            <span key={h} className="crop-h" data-crop-h={h} />
          ))}
        </div>
      )}
      {variant === 'float' ? (
        !cropping && (
          <>
            {FLOAT_CORNERS.map((h) => (
              <span key={h} className="float-handle" data-float-h={h} />
            ))}
            <span className="float-handle float-rotate" data-sticker-rotate />
          </>
        )
      ) : (
        <>
          <span className="sticker-handle" data-sticker-handle />
          <span className="sticker-rotate" data-sticker-rotate />
        </>
      )}
    </div>
  )
}
