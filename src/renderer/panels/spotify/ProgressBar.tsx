import type { MouseEvent } from 'react'
import type { NowPlaying, SpotifyState } from '../../../shared/spotify'

export const fmt = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function ProgressBar({ state, np, progress, thin = false, times = true }: { state: SpotifyState; np: NowPlaying; progress: number; thin?: boolean; times?: boolean }) {
  const duration = np.track.durationMs
  const pct = duration ? (progress / duration) * 100 : 0
  const canSeek = state.canControl && !state.premiumRequired && duration > 0
  const seek = (e: MouseEvent<HTMLDivElement>) => {
    if (!canSeek) return
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    window.shima.spotifyControl({ type: 'seek', positionMs: fraction * duration })
  }
  return (
    <div className="w-full">
      <div
        className={`relative w-full overflow-hidden rounded-full border-2 border-line ${thin ? 'h-1.5' : 'h-2.5'} ${canSeek ? 'cursor-pointer' : ''}`}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        onClick={seek}
      >
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      {times && (
        <div className="mt-1 flex justify-between text-[0.75rem] font-bold text-muted">
          <span>{fmt(progress)}</span>
          <span>{state.offline ? 'offline' : ''}</span>
          <span>-{fmt(duration - progress)}</span>
        </div>
      )}
    </div>
  )
}
