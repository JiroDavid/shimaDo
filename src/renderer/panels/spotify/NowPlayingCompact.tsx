import type { NowPlaying, SpotifyState } from '../../../shared/spotify'
import { Controls } from './Controls'
import { ProgressBar } from './ProgressBar'
import { useProgress } from './useProgress'

export function NowPlayingCompact({ state, np }: { state: SpotifyState; np: NowPlaying }) {
  const progress = useProgress(np)
  return (
    <div className="flex flex-col gap-2 pb-1 pt-1">
      <div className="flex items-center gap-3">
        {np.track.art ? <img src={np.track.art} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" /> : <div className="h-14 w-14 shrink-0 rounded-xl border-2 border-line" />}
        <div className="min-w-0 flex-1">
          <div className="truncate font-extrabold" title={np.track.name}>
            {np.track.name}
          </div>
          <div className="truncate text-[0.85rem] text-muted" title={np.track.artists.join(', ')}>
            {np.track.artists.join(', ')}
          </div>
        </div>
        <Controls state={state} np={np} small />
      </div>
      <ProgressBar state={state} np={np} progress={progress} thin times={false} />
    </div>
  )
}
