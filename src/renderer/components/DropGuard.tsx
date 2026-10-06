import { useEffect } from 'react'
import type { PanelId } from '../../shared/types'
import { useEditState } from '../hooks/useEditState'
import { toast } from '../lib/toast'

export function DropGuard({ panel }: { panel: PanelId }) {
  const edit = useEditState()

  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
    const onDragOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (!edit.active && panel !== 'designer') toast('Turn on Edit mode to add images')
    }
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
    }
  }, [edit.active, panel])

  return null
}
