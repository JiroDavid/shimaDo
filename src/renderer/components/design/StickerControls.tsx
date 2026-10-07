import { normaliseRotation, stickerStart, type Sticker } from '../../../shared/placement'
import { useEditState } from '../../hooks/useEditState'
import { Section } from '../Section'
import { SliderControl } from './SliderControl'

const LEVELS = [
  { id: 'front', label: 'In front' },
  { id: 'behind', label: 'Behind content' },
  { id: 'under', label: 'Behind panel' }
] as const

export function StickerControls({ stickers }: { stickers: Sticker[] }) {
  const edit = useEditState()
  const sticker = stickers[stickers.length - 1]
  if (!sticker) return null
  const ids = stickers.map((s) => s.id)
  const many = stickers.length > 1
  const label = many ? `${stickers.length} stickers` : sticker.kind === 'emoji' ? `Sticker ${sticker.emoji}` : 'Image sticker'
  return (
    <Section label={label} count={sticker.panel}>
      <div className="space-y-3 pb-2">
        <SliderControl label="Size" min={16} max={300} value={sticker.size} onChange={(v) => window.shima.editStickerUpdateMany(ids, { size: v })} />
        <SliderControl label="Rotate" min={-180} max={180} unit="°" value={Math.round(sticker.rotation ?? 0)} onChange={(v) => window.shima.editStickerUpdateMany(ids, { rotation: normaliseRotation(v) })} />
        <SliderControl label="Opacity" min={5} max={100} unit="%" value={Math.round((sticker.opacity ?? 1) * 100)} onChange={(v) => window.shima.editStickerUpdateMany(ids, { opacity: v / 100 })} />
        <SliderControl label="Corners" min={0} max={50} unit="%" value={sticker.round ?? 0} onChange={(v) => window.shima.editStickerUpdateMany(ids, { round: v })} />
        <div className="flex flex-wrap gap-1.5">
          <button className={`btn flex-1 ${sticker.flipX ? 'btn-active' : ''}`} aria-pressed={sticker.flipX === true} onClick={() => window.shima.editStickerUpdateMany(ids, { flipX: !sticker.flipX })}>
            Flip H
          </button>
          <button className={`btn flex-1 ${sticker.flipY ? 'btn-active' : ''}`} aria-pressed={sticker.flipY === true} onClick={() => window.shima.editStickerUpdateMany(ids, { flipY: !sticker.flipY })}>
            Flip V
          </button>
          {!many && sticker.kind === 'image' && (
            <button className={`btn flex-1 ${edit.cropping === sticker.id ? 'btn-active' : ''}`} onClick={() => window.shima.editCropMode(edit.cropping === sticker.id ? null : sticker.id)}>
              {edit.cropping === sticker.id ? 'Done' : 'Crop'}
            </button>
          )}
        </div>
        <button className="btn" onClick={() => window.shima.editStickerUpdateMany(ids, { rotation: 0, flipX: false, flipY: false, crop: null, opacity: 1, round: 0 })}>
          Reset image
        </button>
        {sticker.panel !== 'free' && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Level">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              role="radio"
              aria-checked={stickers.every((s) => s.layer === l.id)}
              className={`btn !min-h-[28px] !px-2.5 !text-[0.8rem] ${stickers.every((s) => s.layer === l.id) ? 'btn-active' : ''}`}
              onClick={() => window.shima.editStickerUpdateMany(ids, { layer: l.id })}
            >
              {l.label}
            </button>
          ))}
        </div>
        )}
        {sticker.panel !== 'free' && <p className="text-[0.78rem] text-muted">Reorder in front of or behind other elements from the Layers window.</p>}
        <div className="flex gap-1.5">
          <button className="btn flex-1" onClick={() => ids.forEach((id) => window.shima.editStickerDuplicate(id))}>
            Duplicate
          </button>
          <button className="btn flex-1" onClick={() => ids.forEach((id) => window.shima.editStickerDelete(id))}>
            Delete
          </button>
        </div>
        <button className="btn" onClick={() => window.shima.editStickerUpdateMany(ids, stickerStart(0))}>
          Bring back
        </button>
      </div>
    </Section>
  )
}
