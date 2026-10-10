import { useEffect, useState } from 'react'
import type { SpotifyState } from '../../shared/spotify'

type Tab = 'now' | 'stats'

const fmt = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function NowPlayingView({ state }: { state: SpotifyState }) {
  const [, tick] = useState(0)
  const np = state.nowPlaying
  useEffect(() => {
    if (!np?.playing) return
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [np?.playing, np?.fetchedAt])

  if (!np) return <p className="py-6 text-center text-muted">{state.offline ? 'Offline - waiting for Spotify' : 'Nothing playing'}</p>
  const progress = Math.min(np.track.durationMs, np.progressMs + (np.playing ? Date.now() - np.fetchedAt : 0))
  const pct = np.track.durationMs ? (progress / np.track.durationMs) * 100 : 0
  return (
    <div className="flex flex-col items-center gap-3 pb-2 pt-2">
      {np.track.art ? (
        <img src={np.track.art} alt="" className="aspect-square w-full max-w-[220px] rounded-2xl object-cover" />
      ) : (
        <div className="aspect-square w-full max-w-[220px] rounded-2xl border-2 border-line" />
      )}
      <div className="w-full text-center">
        <div className="truncate text-[1.1rem] font-extrabold" title={np.track.name}>
          {np.track.name}
        </div>
        <div className="truncate text-muted" title={np.track.artists.join(', ')}>
          {np.track.artists.join(', ')}
        </div>
        <div className="truncate text-[0.8rem] text-muted">{np.track.album}</div>
      </div>
      <div className="w-full">
        <div className="h-2 overflow-hidden rounded-full border-2 border-line" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[0.75rem] font-bold text-muted">
          <span>{fmt(progress)}</span>
          <span>
            {np.playing ? '' : 'Paused'}
            {state.offline ? ' - offline' : ''}
          </span>
          <span>{fmt(np.track.durationMs)}</span>
        </div>
      </div>
    </div>
  )
}

export function Spotify() {
  const [tab, setTab] = useState<Tab>('now')
  const [state, setState] = useState<SpotifyState | null>(null)

  useEffect(() => {
    window.shima.getSpotifyState().then(setState)
    return window.shima.onSpotifyState(setState)
  }, [])

  useEffect(() => {
    const report = () => window.shima.spotifyWatch(tab === 'now' && document.visibilityState === 'visible')
    report()
    document.addEventListener('visibilitychange', report)
    return () => {
      document.removeEventListener('visibilitychange', report)
      window.shima.spotifyWatch(false)
    }
  }, [tab])

  if (!state) return null
  const connected = state.status === 'connected'

  return (
    <div className="flex flex-col gap-2 pb-2 pt-2" style={{ minHeight: 'inherit' }}>
      <div className="flex gap-1" role="tablist">
        {(['now', 'stats'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`btn !min-h-[30px] !px-3 !py-0 !text-[0.85rem] ${tab === t ? 'btn-active' : ''}`} onClick={() => setTab(t)}>
            {t === 'now' ? 'Now Playing' : 'Stats'}
          </button>
        ))}
      </div>
      {!connected ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          {state.status === 'no-client' ? (
            <>
              <p className="text-muted">Add your Spotify client ID in Settings to get started.</p>
              <button className="btn" onClick={() => window.shima.togglePanel('settings')}>
                Open Settings
              </button>
            </>
          ) : state.status === 'connecting' ? (
            <p className="text-muted">Waiting for Spotify in your browser...</p>
          ) : (
            <button className="btn btn-primary" onClick={() => window.shima.spotifyConnect()}>
              Connect Spotify
            </button>
          )}
          {state.error && <p className="text-[0.85rem] font-bold text-accent">{state.error}</p>}
        </div>
      ) : tab === 'now' ? (
        <NowPlayingView state={state} />
      ) : (
        <p className="py-6 text-center text-muted">Stats are coming soon.</p>
      )}
    </div>
  )
}
