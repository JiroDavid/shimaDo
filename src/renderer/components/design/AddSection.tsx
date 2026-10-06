import { useEffect, useState } from 'react'
import type { AssetResult } from '../../../shared/assets'
import { isEmoji } from '../../../shared/emoji'
import { stickerStart, type StickerPanel } from '../../../shared/placement'
import type { AppData } from '../../../shared/types'
import { fileBytes, isImageFile } from '../../lib/files'
import { Section } from '../Section'
import { EmojiGrid } from './EmojiGrid'
import { ImageGallery } from './ImageGallery'

interface Props {
  data: AppData
  target: StickerPanel
  targetName: string
  canBackground: boolean
  onBackground: (assetId: string) => void
}

export function AddSection({ data, target, targetName, canBackground, onBackground }: Props) {
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)

  const count = data.design.stickers.filter((s) => s.panel === target).length
  const place = (draft: { kind: 'emoji'; emoji: string } | { kind: 'image'; asset: string }) => {
    const { x, y } = stickerStart(count)
    window.shima.editStickerAdd({ panel: target, x, y, size: 64, layer: 'front', ...draft })
  }

  const addFiles = async (files: File[]) => {
    setError('')
    for (const file of files.filter(isImageFile).slice(0, 5)) {
      const r: AssetResult = await window.shima.assetAdd(file.name, await fileBytes(file))
      if (!r.ok) setError(r.error)
    }
  }

  const choose = async () => {
    setError('')
    const r = await window.shima.assetChoose()
    if (!r.ok && r.error) setError(r.error)
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target
      if (el instanceof HTMLElement && el.closest('input, textarea')) return
      const files = Array.from(e.clipboardData?.files ?? []).filter(isImageFile)
      if (files.length > 0) {
        e.preventDefault()
        void addFiles(files)
        return
      }
      const text = e.clipboardData?.getData('text')?.trim() ?? ''
      if (isEmoji(text)) {
        e.preventDefault()
        place({ kind: 'emoji', emoji: text })
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  })

  return (
    <Section label="Add" count={`on ${targetName}`}>
      <div className="space-y-3 pb-2">
        <EmojiGrid onPlace={(emoji) => place({ kind: 'emoji', emoji })} />
        <div
          className={`rounded-2xl border-2 border-dashed px-3 py-4 text-center text-[0.85rem] font-bold ${over ? 'border-accent text-accent' : 'border-line text-muted'}`}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            void addFiles(Array.from(e.dataTransfer.files))
          }}
        >
          Drop images or GIFs here
          <div className="mt-2 flex justify-center gap-2">
            <button className="btn !min-h-[28px] !px-3 !text-[0.8rem]" onClick={choose}>
              Choose file
            </button>
          </div>
          <div className="mt-1 text-[0.72rem] font-semibold">or press Ctrl+V with this window focused</div>
        </div>
        {error && <p className="text-[0.82rem] font-bold text-urgent">{error}</p>}
        <ImageGallery assets={data.assets} canBackground={canBackground} onPlace={(asset) => place({ kind: 'image', asset })} onBackground={onBackground} />
      </div>
    </Section>
  )
}
