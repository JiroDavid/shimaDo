import { useState } from 'react'
import type { AssetInfo } from '../../../shared/assets'
import type { AssetUse } from '../../../shared/placement'
import { assetUrl } from '../../lib/assetUrl'
import { panelLabel } from '../../lib/panelLabel'

interface Props {
  assets: Record<string, AssetInfo>
  usage: Record<string, AssetUse[]>
  canBackground: boolean
  targetName: string
  onPlace: (id: string) => void
  onBackground: (id: string) => void
}

const describeUse = (u: AssetUse) => `${panelLabel(u.panel)}${u.kind === 'background' ? ' bg' : ''}${u.count > 1 ? ` x${u.count}` : ''}`

export function ImageGallery({ assets, usage, canBackground, targetName, onPlace, onBackground }: Props) {
  const [confirm, setConfirm] = useState<string | null>(null)
  const list = Object.values(assets).sort((a, b) => b.addedAt - a.addedAt)
  if (list.length === 0) return <p className="text-[0.85rem] text-muted">No images yet. Drop some above, or choose several files at once.</p>
  return (
    <div>
      <p className="mb-1.5 text-[0.78rem] text-muted">
        Your library stays here whichever window you pick. Place puts an image in empty space; drag it onto a window to put it inside.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {list.map((a) => (
          <div key={a.id} className="space-y-1 rounded-xl border-2 border-line p-1">
            <img src={assetUrl(a.id)} alt={a.name} title={a.name} className="h-16 w-full rounded-lg object-contain" draggable={false} />
            {(usage[a.id] ?? []).length > 0 && (
              <div className="flex flex-wrap gap-0.5" aria-label="Used on">
                {(usage[a.id] ?? []).map((u) => (
                  <span key={`${u.panel}-${u.kind}`} className="rounded-full border border-line px-1.5 text-[0.62rem] font-bold uppercase tracking-wide text-muted">
                    {describeUse(u)}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              <button className="btn !min-h-[24px] !px-1.5 !text-[0.7rem]" onClick={() => onPlace(a.id)}>
                Place
              </button>
              <button className="btn !min-h-[24px] !px-1.5 !text-[0.7rem]" disabled={!canBackground} title="Use as background" onClick={() => onBackground(a.id)}>
                Bg
              </button>
              <button
                className={`btn !min-h-[24px] !px-1.5 !text-[0.7rem] ${confirm === a.id ? 'btn-danger' : ''}`}
                title="Delete this image and everything using it"
                onClick={() => {
                  if (confirm !== a.id) return setConfirm(a.id)
                  window.shima.assetDelete(a.id)
                  setConfirm(null)
                }}
              >
                {confirm === a.id ? 'Confirm delete?' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
