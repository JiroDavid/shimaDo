import { useEffect, useState } from 'react'
import type { EditState } from '../../shared/types'

const INITIAL: EditState = { active: false, selected: [], canUndo: false, canRedo: false, dom: {}, cropping: null, spaceClicks: 0 }

export function useEditState(): EditState {
  const [state, setState] = useState<EditState>(INITIAL)
  useEffect(() => {
    let alive = true
    window.shima.getEditState().then((s) => {
      if (alive) setState(s)
    })
    const off = window.shima.onEditState(setState)
    return () => {
      alive = false
      off()
    }
  }, [])
  return state
}
