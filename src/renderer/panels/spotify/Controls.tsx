import type { NowPlaying, SpotifyState } from '../../../shared/spotify'

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
)
const PREV = 'M6 6h2v12H6zM9.5 12 18 6v12z'
const NEXT = 'M16 6h2v12h-2zM6 18V6l8.5 6z'
const PLAY = 'M8 5v14l11-7z'
const PAUSE = 'M6 5h4v14H6zM14 5h4v14h-4z'

export function Controls({ state, np, small = false }: { state: SpotifyState; np: NowPlaying; small?: boolean }) {
  const blocked = !state.canControl || state.premiumRequired
  const send = (type: 'play' | 'pause' | 'next' | 'previous') => window.shima.spotifyControl({ type })
  const base = `flex items-center justify-center rounded-full transition-transform active:scale-90 ${blocked ? 'opacity-40' : 'hover:text-accent'}`
  const side = small ? 'h-7 w-7' : 'h-10 w-10'
  const main = small ? 'h-8 w-8' : 'h-14 w-14'
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex items-center ${small ? 'gap-2' : 'gap-6'}`}>
        {!small && (
          <button className={`${base} ${side}`} aria-label="Previous" disabled={blocked} onClick={() => send('previous')}>
            <Icon d={PREV} />
          </button>
        )}
        <button className={`${base} ${main}`} aria-label={np.playing ? 'Pause' : 'Play'} disabled={blocked} onClick={() => send(np.playing ? 'pause' : 'play')}>
          <Icon d={np.playing ? PAUSE : PLAY} />
        </button>
        <button className={`${base} ${side}`} aria-label="Next" disabled={blocked} onClick={() => send('next')}>
          <Icon d={NEXT} />
        </button>
      </div>
      {!state.canControl ? (
        <button className="btn !min-h-[26px] !px-2 !py-0 !text-[0.75rem]" onClick={() => window.shima.spotifyConnect()}>
          Reconnect to enable controls
        </button>
      ) : state.premiumRequired ? (
        <p className="text-[0.75rem] font-bold text-muted">Controls need Spotify Premium</p>
      ) : (
        state.controlError && <p className="text-[0.75rem] font-bold text-accent">{state.controlError}</p>
      )}
    </div>
  )
}
