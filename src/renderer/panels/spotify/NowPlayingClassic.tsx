import type { NowPlaying, SpotifyState } from '../../../shared/spotify'
import { Controls } from './Controls'
import { ProgressBar } from './ProgressBar'
import { useProgress } from './useProgress'
import { VolumeSlider } from './VolumeSlider'

export function NowPlayingClassic({ state, np }: { state: SpotifyState; np: NowPlaying }) {
  const progress = useProgress(np)
  return (
    <div className="flex flex-col gap-3 pb-2 pt-1">
      {np.track.art ? (
        <img src={np.track.art} alt="" className="aspect-square w-full rounded-2xl object-cover" />
      ) : (
        <div className="aspect-square w-full rounded-2xl border-2 border-line" />
      )}
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[1.15rem] font-extrabold" title={np.track.name}>
            {np.track.name}
          </div>
          <div className="truncate text-muted" title={np.track.artists.join(', ')}>
            {np.track.artists.join(', ')}
          </div>
        </div>
        {np.device && <div className="shrink-0 text-[0.75rem] font-bold text-muted">{np.device.name}</div>}
      </div>
      <ProgressBar state={state} np={np} progress={progress} />
      <Controls state={state} np={np} />
      <VolumeSlider state={state} np={np} />
    </div>
  )
}
