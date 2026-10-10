import { useEffect, useState } from 'react'
import type { UpdateState } from '../../shared/update'

export function UpdatePrompt() {
  const [state, setState] = useState<UpdateState>({ kind: 'idle' })

  useEffect(() => {
    window.shima.getUpdateState().then(setState)
    return window.shima.onUpdateState(setState)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.shima.dismissUpdate()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (state.kind === 'available') {
    return (
      <div className="flex h-full flex-col justify-between gap-3 pt-1">
        <div>
          <h1 className="heading text-[1.6rem]">ShimaDo {state.version} is available</h1>
          {state.notes && <p className="mt-2 max-h-[7.5rem] overflow-y-auto whitespace-pre-line text-muted">{state.notes}</p>}
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn" onClick={() => window.shima.dismissUpdate()}>
            Later
          </button>
          <button className="btn" onClick={() => window.shima.downloadUpdate()}>
            Download
          </button>
        </div>
      </div>
    )
  }
  if (state.kind === 'downloading') {
    return (
      <div className="flex h-full flex-col justify-center gap-3">
        <h1 className="heading text-[1.6rem]">Downloading {state.version}</h1>
        <div className="h-3 overflow-hidden rounded-full border-2 border-line" role="progressbar" aria-valuenow={state.percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-accent" style={{ width: `${state.percent}%` }} />
        </div>
        <p className="text-muted">{state.percent}%</p>
      </div>
    )
  }
  if (state.kind === 'ready') {
    return (
      <div className="flex h-full flex-col justify-between gap-3 pt-1">
        <div>
          <h1 className="heading text-[1.6rem]">{state.version} is ready</h1>
          <p className="mt-2 text-muted">Restart to finish updating, or it installs the next time you quit.</p>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn" onClick={() => window.shima.installUpdateOnQuit()}>
            On next quit
          </button>
          <button className="btn" onClick={() => window.shima.installUpdate()}>
            Restart now
          </button>
        </div>
      </div>
    )
  }
  if (state.kind === 'error') {
    return (
      <div className="flex h-full flex-col justify-between gap-3 pt-1">
        <div>
          <h1 className="heading text-[1.6rem]">Update failed</h1>
          <p className="mt-2 text-muted">{state.message}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn" onClick={() => window.shima.dismissUpdate()}>
            Close
          </button>
          {state.during === 'download' && (
            <button className="btn" onClick={() => window.shima.downloadUpdate()}>
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }
  return null
}
