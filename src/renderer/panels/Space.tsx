import { useEffect } from 'react'
import { fileBytes, isImageFile } from '../lib/files'

const MAX_DROP = 20
const FANOUT = 28
const DROP_SIZE = 160

export function SpaceApp() {
  useEffect(() => {
    const onDown = () => window.shima.editSpaceClick()
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onDrop = async (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      const files = Array.from(e.dataTransfer?.files ?? []).filter(isImageFile).slice(0, MAX_DROP)
      let placed = 0
      for (const file of files) {
        const result = await window.shima.assetAdd(file.name, await fileBytes(file))
        if (!result.ok) continue
        const x = Math.round(e.screenX - DROP_SIZE / 2 + placed * FANOUT)
        const y = Math.round(e.screenY - DROP_SIZE / 2 + placed * FANOUT)
        window.shima.editStickerAdd({ panel: 'free', kind: 'image', asset: result.id, x, y, size: DROP_SIZE, layer: 'front' })
        placed++
      }
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('dragover', onOver)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('dragover', onOver)
      document.removeEventListener('drop', onDrop)
    }
  }, [])

  return <div className="space-catcher" />
}
