import { stickerStart, type Sticker } from '../../../shared/placement'
import { Section } from '../Section'
import { SliderControl } from './SliderControl'

interface Props {
  sticker: Sticker | undefined
  onThisWindow: Sticker[]
  windowName: string
}

const ZERO = { color: '', background: '', borderColor: '', radius: 0, borderWidth: 0, fontSize: 0, bold: false }

export function StickerControls({ sticker, onThisWindow, windowName }: Props) {
  return (
    <>
      {sticker && (
        <Section label={sticker.kind === 'emoji' ? `Sticker ${sticker.emoji}` : 'Image sticker'} count={sticker.panel}>
          <div className="space-y-3 pb-2">
            <SliderControl label="Size" min={16} max={300} value={sticker.size} onChange={(v) => window.shima.editStickerUpdate(sticker.id, { size: v })} />
            <div className="flex gap-1.5" role="radiogroup" aria-label="Layer">
              {(['front', 'behind'] as const).map((l) => (
                <button
                  key={l}
                  role="radio"
                  aria-checked={sticker.layer === l}
                  className={`btn flex-1 !px-2 ${sticker.layer === l ? 'btn-active' : ''}`}
                  onClick={() => window.shima.editStickerUpdate(sticker.id, { layer: l })}
                >
                  {l === 'front' ? 'In front' : 'Behind'}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button className="btn flex-1" onClick={() => window.shima.editStickerDuplicate(sticker.id)}>
                Duplicate
              </button>
              <button className="btn flex-1" onClick={() => window.shima.editStickerDelete(sticker.id)}>
                Delete
              </button>
            </div>
            <button className="btn" onClick={() => window.shima.editStickerUpdate(sticker.id, stickerStart(0))}>
              Bring back
            </button>
          </div>
        </Section>
      )}
      {onThisWindow.length > 0 && (
        <Section label="Stickers" count={`on ${windowName}`}>
          <div className="flex flex-wrap gap-1.5 pb-2">
            {onThisWindow.map((s) => (
              <button
                key={s.id}
                className={`btn !min-h-[28px] !px-2 !text-[0.85rem] ${sticker?.id === s.id ? 'btn-active' : ''}`}
                onClick={() => window.shima.editSelect({ id: `sticker:${s.id}`, panel: s.panel, computed: ZERO })}
              >
                {s.kind === 'emoji' ? s.emoji : 'Image'}
              </button>
            ))}
          </div>
        </Section>
      )}
    </>
  )
}
