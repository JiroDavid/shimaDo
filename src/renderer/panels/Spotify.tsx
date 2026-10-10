import { useEffect, useState } from 'react'
import type { AppData } from '../../shared/types'
import type { SpotifyState, SpotifyStyle, Stats, StatsRange } from '../../shared/spotify'
import { BarChart } from '../components/BarChart'
import { NowPlayingClassic } from './spotify/NowPlayingClassic'
import { NowPlayingCompact } from './spotify/NowPlayingCompact'
import { StyleSwitch } from './spotify/StyleSwitch'

type Tab = 'now' | 'stats'

function StatsView() {
  const [range, setRange] = useState<StatsRange>('7d')
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const load = () => window.shima.spotifyStats(range).then(setStats)
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [range])

  const hours = stats ? Math.floor(stats.totalMs / 3_600_000) : 0
  const minutes = stats ? Math.round((stats.totalMs % 3_600_000) / 60_000) : 0
  return (
    <div className="flex flex-col gap-3 pb-2">
      <div className="flex gap-1">
        {(['7d', '30d', 'all'] as const).map((r) => (
          <button key={r} className={`btn !min-h-[28px] !px-2.5 !py-0 !text-[0.8rem] ${range === r ? 'btn-active' : ''}`} onClick={() => setRange(r)}>
            {r === '7d' ? '7 days' : r === '30d' ? '30 days' : 'All time'}
          </button>
        ))}
      </div>
      {!stats || stats.plays === 0 ? (
        <p className="py-4 text-center text-muted">Listen for a while and check back.</p>
      ) : (
        <>
          <div className="text-center">
            <div className="text-[1.6rem] font-extrabold text-accent">{hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}</div>
            <div className="text-[0.8rem] font-bold text-muted">{stats.plays.toLocaleString()} plays</div>
          </div>
          <BarChart values={stats.perDay.map((d) => d.minutes)} labels={stats.perDay.map((d) => d.date.slice(8))} />
          <div>
            <div className="mb-1 text-[0.8rem] font-extrabold uppercase tracking-wider text-muted">Top artists</div>
            {stats.topArtists.map((a) => (
              <div key={a.name} className="flex justify-between gap-2">
                <span className="truncate">{a.name}</span>
                <span className="font-bold text-muted">{a.plays}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-1 text-[0.8rem] font-extrabold uppercase tracking-wider text-muted">Top tracks</div>
            {stats.topTracks.map((t) => (
              <div key={t.name + t.artist} className="flex justify-between gap-2">
                <span className="truncate">
                  {t.name} <span className="text-muted">- {t.artist}</span>
                </span>
                <span className="font-bold text-muted">{t.plays}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function NowPlayingView({ state, style }: { state: SpotifyState; style: SpotifyStyle }) {
  const np = state.nowPlaying
  if (!np) return <p className="py-6 text-center text-muted">{state.offline ? 'Offline - waiting for Spotify' : 'Nothing playing'}</p>
  if (style === 'compact') return <NowPlayingCompact state={state} np={np} />
  return <NowPlayingClassic state={state} np={np} />
}

export function Spotify({ data }: { data: AppData }) {
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1" role="tablist">
          {(['now', 'stats'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`btn !min-h-[30px] !px-3 !py-0 !text-[0.85rem] ${tab === t ? 'btn-active' : ''}`} onClick={() => setTab(t)}>
              {t === 'now' ? 'Now Playing' : 'Stats'}
            </button>
          ))}
        </div>
        {connected && tab === 'now' && <StyleSwitch value={data.settings.spotifyStyle} />}
      </div>
      {!connected ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          {state.status === 'no-client' ? (
            <>
              <p className="text-muted">Add your Spotify client ID in Settings to get started. The setup guide there takes about 3 minutes.</p>
              <button className="btn" onClick={() => window.shima.togglePanel('settings')}>
                Open Settings
              </button>
            </>
          ) : state.status === 'connecting' ? (
            <>
              <p className="text-muted">Waiting for Spotify in your browser...</p>
              <button className="btn" onClick={() => window.shima.spotifyCancel()}>
                Cancel
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => window.shima.spotifyConnect()}>
              Connect Spotify
            </button>
          )}
          {state.error && <p className="text-[0.85rem] font-bold text-accent">{state.error}</p>}
        </div>
      ) : tab === 'now' ? (
        <NowPlayingView state={state} style={data.settings.spotifyStyle} />
      ) : (
        <StatsView />
      )}
    </div>
  )
}
