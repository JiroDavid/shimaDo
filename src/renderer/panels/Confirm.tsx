import { useEffect } from 'react'

export function Confirm() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.shima.hidePanel('confirm')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-full flex-col justify-between gap-3 pt-1">
      <div>
        <h1 className="heading text-[1.9rem]">Exit ShimaDo?</h1>
        <p className="mt-2 text-muted">Reminders stop until you start ShimaDo again.</p>
      </div>
      <div className="flex justify-end gap-3">
        <button className="btn" onClick={() => window.shima.hidePanel('confirm')}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={() => window.shima.confirmExit()}>
          Exit
        </button>
      </div>
    </div>
  )
}
