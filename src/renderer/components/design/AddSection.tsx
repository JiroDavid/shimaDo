import { useEffect, useState } from 'react'
import type { AssetResult } from '../../../shared/assets'
import { isEmoji } from '../../../shared/emoji'
import { assetUsage, type StickerPanel } from '../../../shared/placement'
import type { AppData } from '../../../shared/types'
import { fileBytes, isImageFile } from '../../lib/files'
import { Section } from '../Section'
import { EmojiGrid } from './EmojiGrid'
import { ImageGallery } from './ImageGallery'

const MAX_BATCH = 50

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

  const place = (draft: { kind: 'emoji'; emoji: string } | { kind: 'image'; asset: string }) => {
    window.shima.editStickerAdd({ panel: 'free', x: 0, y: 0, size: 160, layer: 'front', spawn: true, ...draft } as never)
  }

  const report = (results: AssetResult[]) => {
    const failed = results.filter((r): r is Extract<AssetResult, { ok: false }> => !r.ok && r.error !== '')
    setError(failed.length === 0 ? '' : failed.length === 1 ? failed[0].error : `${failed.length} images could not be added. ${failed[0].error}`)
  }

  const addFiles = async (files: File[]) => {
    const results: AssetResult[] = []
    for (const file of files.filter(isImageFile).slice(0, MAX_BATCH)) results.push(await window.shima.assetAdd(file.name, await fileBytes(file)))
    report(results)
  }

  const choose = async () => {
    setError('')
    report(await window.shima.assetChoose())
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
          Drop as many images or GIFs as you like
          <div className="mt-2 flex justify-center gap-2">
            <button className="btn !min-h-[28px] !px-3 !text-[0.8rem]" onClick={choose}>
              Choose files
            </button>
          </div>
          <div className="mt-1 text-[0.72rem] font-semibold">or press Ctrl+V with this window focused</div>
        </div>
        {error && <p className="text-[0.82rem] font-bold text-urgent">{error}</p>}
        <ImageGallery assets={data.assets} usage={assetUsage(data.design.stickers, data.design.backgrounds)} canBackground={canBackground && target !== 'free'} targetName={targetName} onPlace={(asset) => place({ kind: 'image', asset })} onBackground={onBackground} />
      </div>
    </Section>
  )
}
