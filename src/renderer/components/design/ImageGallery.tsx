import { useState } from 'react'
import type { AssetInfo } from '../../../shared/assets'
import { assetUrl } from '../../lib/assetUrl'

interface Props {
  assets: Record<string, AssetInfo>
  canBackground: boolean
  onPlace: (id: string) => void
  onBackground: (id: string) => void
}

export function ImageGallery({ assets, canBackground, onPlace, onBackground }: Props) {
  const [confirm, setConfirm] = useState<string | null>(null)
  const list = Object.values(assets).sort((a, b) => b.addedAt - a.addedAt)
  if (list.length === 0) return <p className="text-[0.85rem] text-muted">No images yet. Drop one above.</p>
  return (
    <div className="grid grid-cols-3 gap-2">
      {list.map((a) => (
        <div key={a.id} className="space-y-1 rounded-xl border-2 border-line p-1">
          <img src={assetUrl(a.id)} alt={a.name} title={a.name} className="h-16 w-full rounded-lg object-contain" draggable={false} />
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
  )
}
