import { useState } from 'react'
import { elementById } from '../../../shared/elements'
import { STICKER_REF, SURFACE_SUFFIX, effectiveOrder, layerBase, stickerRef, type Region } from '../../../shared/layers'
import type { Design } from '../../../shared/design'
import type { Sticker } from '../../../shared/placement'
import { assetUrl } from '../../lib/assetUrl'

interface Props {
  design: Design
  panel: string
  dom: string[] | undefined
  selected: ReadonlySet<string>
}

export type Row =
  | { kind: 'item'; key: string; select: string; label: string; region: Region; ref: string; sticker?: Sticker }
  | { kind: 'fixed'; key: string; label: string; drop: Region }

const stickerName = (s: Sticker) => (s.kind === 'emoji' ? 'Sticker' : 'Image')

export function buildRows(design: Design, panel: string, dom?: string[]): Row[] {
  const stickers = design.stickers.filter((s) => s.panel === panel)
  const byId = new Map(stickers.map((s) => [s.id, s]))
  const rows: Row[] = []
  for (const ref of effectiveOrder(design, panel, dom).reverse()) {
    if (ref.startsWith(STICKER_REF)) {
      const s = byId.get(ref.slice(STICKER_REF.length))
      if (s) rows.push({ kind: 'item', key: ref, select: ref, label: stickerName(s), region: 'front', ref, sticker: s })
    } else {
      rows.push({ kind: 'item', key: ref, select: layerBase(ref), label: `${elementById(layerBase(ref))?.name ?? ref}${ref.endsWith(SURFACE_SUFFIX) ? ' background' : ''}`, region: 'front', ref })
    }
  }
  rows.push({ kind: 'fixed', key: 'rest', label: 'Everything else', drop: 'behind' })
  for (const s of stickers.filter((x) => x.layer === 'behind').reverse()) rows.push({ kind: 'item', key: stickerRef(s.id), select: stickerRef(s.id), label: stickerName(s), region: 'behind', ref: s.id, sticker: s })
  rows.push({ kind: 'fixed', key: 'bg', label: 'Panel background', drop: 'under' })
  for (const s of stickers.filter((x) => x.layer === 'under').reverse()) rows.push({ kind: 'item', key: stickerRef(s.id), select: stickerRef(s.id), label: stickerName(s), region: 'under', ref: s.id, sticker: s })
  return rows
}

function Thumb({ sticker }: { sticker?: Sticker }) {
  if (!sticker) return <span className="layer-thumb layer-thumb-el" aria-hidden="true" />
  return (
    <span className="layer-thumb" aria-hidden="true">
      {sticker.kind === 'emoji' ? sticker.emoji : <img src={assetUrl(sticker.asset ?? '')} alt="" draggable={false} />}
    </span>
  )
}

export function LayerList({ design, panel, dom, selected }: Props) {
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [overKey, setOverKey] = useState<string | null>(null)

  const finish = () => {
    setDragKey(null)
    setOverKey(null)
  }

  const drop = (row: Row) => {
    const dragged = dragKey
    finish()
    if (!dragged || dragged === row.key) return
    if (row.kind === 'fixed') window.shima.editArrange(panel, dragged, row.drop, null)
    else window.shima.editArrange(panel, dragged, row.region, row.ref)
  }

  return (
    <div className="space-y-1" role="list" aria-label="Layer order, top is in front" onMouseLeave={() => window.shima.editHover({ panel, id: null })}>
      {buildRows(design, panel, dom).map((row) => {
        const over = overKey === row.key && dragKey !== null && dragKey !== row.key
        const common = {
          role: 'listitem',
          onDragOver: (e: React.DragEvent) => {
            if (!dragKey) return
            e.preventDefault()
            setOverKey(row.key)
          },
          onDragLeave: () => setOverKey((k) => (k === row.key ? null : k)),
          onDrop: (e: React.DragEvent) => {
            e.preventDefault()
            drop(row)
          }
        }
        if (row.kind === 'fixed') {
          return (
            <div key={row.key} {...common} className={`layer-row layer-marker ${over ? 'layer-over' : ''}`}>
              {row.label}
            </div>
          )
        }
        return (
          <div
            key={row.key}
            {...common}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', row.key)
              setDragKey(row.key)
            }}
            onDragEnd={finish}
            onMouseEnter={() => window.shima.editHover({ panel, id: row.select })}
            onClick={(e) => window.shima.editSelectRequest({ panel, ids: [row.select], additive: e.ctrlKey || e.metaKey || e.shiftKey })}
            className={`layer-row layer-item ${selected.has(row.select) ? 'layer-active' : ''} ${over ? 'layer-over' : ''} ${dragKey === row.key ? 'layer-dragging' : ''}`}
          >
            <span className="layer-grip" aria-hidden="true">
              ⋮⋮
            </span>
            <Thumb sticker={row.sticker} />
            <span className="min-w-0 truncate">{row.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export function FreeList({ design, selected }: { design: Design; selected: ReadonlySet<string> }) {
  const stickers = design.stickers.filter((s) => s.panel === 'free').reverse()
  if (stickers.length === 0) {
    return <p className="text-[0.85rem] text-muted">Nothing on the desktop yet. Choose Place on an image below to put it in the middle of the screen, then drag it anywhere.</p>
  }
  return (
    <div className="space-y-1" role="list" aria-label="Images on the desktop">
      {stickers.map((s) => (
        <div
          key={s.id}
          role="listitem"
          className={`layer-row layer-item ${selected.has(`sticker:${s.id}`) ? 'layer-active' : ''}`}
          onClick={(e) => window.shima.editSelectRequest({ panel: 'free', ids: [`sticker:${s.id}`], additive: e.ctrlKey || e.metaKey || e.shiftKey })}
        >
          <Thumb sticker={s} />
          <span className="min-w-0 truncate">{stickerName(s)}</span>
        </div>
      ))}
    </div>
  )
}
