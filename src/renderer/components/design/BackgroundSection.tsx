import type { AssetInfo } from '../../../shared/assets'
import type { Background } from '../../../shared/placement'
import { assetUrl } from '../../lib/assetUrl'
import { Section } from '../Section'
import { SliderControl } from './SliderControl'

interface Props {
  surfaceKey: string
  bg: Background | undefined
  assets: Record<string, AssetInfo>
}

const FITS: Background['fit'][] = ['cover', 'contain', 'tile']

export function BackgroundSection({ surfaceKey, bg, assets }: Props) {
  const set = (patch: Partial<Background>) => bg && window.shima.editBackground(surfaceKey, { ...bg, ...patch })
  return (
    <Section label="Background image">
      {!bg || !assets[bg.asset] ? (
        <p className="pb-2 text-[0.85rem] text-muted">No image yet. Use Bg on an image in the gallery.</p>
      ) : (
        <div className="space-y-3 pb-2">
          <img src={assetUrl(bg.asset)} alt="" className="h-16 w-full rounded-lg object-contain" draggable={false} />
          <div className="flex gap-1.5" role="radiogroup" aria-label="Fit">
            {FITS.map((f) => (
              <button key={f} role="radio" aria-checked={bg.fit === f} className={`btn flex-1 !px-2 ${bg.fit === f ? 'btn-active' : ''}`} onClick={() => set({ fit: f })}>
                {f}
              </button>
            ))}
          </div>
          <SliderControl label="Opacity" min={5} max={100} unit="%" value={Math.round(bg.opacity * 100)} onChange={(v) => set({ opacity: v / 100 })} />
          <button className="btn" onClick={() => window.shima.editBackground(surfaceKey, null)}>
            Remove
          </button>
        </div>
      )}
    </Section>
  )
}
