import { useEffect } from 'react'
import { useEditState } from '../hooks/useEditState'

const TEXT_INPUT = 'input:not([type=range]):not([type=checkbox]):not([type=color]), textarea, [contenteditable=true]'

export function EditShortcuts() {
  const edit = useEditState()

  useEffect(() => {
    if (!edit.active) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      if (e.target instanceof Element && e.target.closest(TEXT_INPUT)) return
      const key = e.key.toLowerCase()
      if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey) window.shima.editRedo()
        else window.shima.editUndo()
      } else if (key === 'y') {
        e.preventDefault()
        window.shima.editRedo()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [edit.active])

  return null
}
