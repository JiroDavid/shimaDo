import { useEffect, useRef, useState } from 'react'
import type { NowPlaying, SpotifyState } from '../../../shared/spotify'
import { useAudioBars } from '../../hooks/useAudioBars'
import { Controls } from './Controls'
import { ProgressBar } from './ProgressBar'
import { useProgress } from './useProgress'

export function NowPlayingVisualizer({ state, np }: { state: SpotifyState; np: NowPlaying }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const progress = useProgress(np)
  const [visible, setVisible] = useState(document.visibilityState === 'visible')

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const status = useAudioBars(visible && np.playing, canvas)
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {np.track.art && <img src={np.track.art} alt="" className="absolute inset-0 h-full w-full scale-150 object-cover opacity-40 blur-2xl" />}
      <div className="relative flex flex-col gap-3 p-3">
        <div className="flex items-center gap-3">
          {np.track.art ? <img src={np.track.art} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" /> : <div className="h-20 w-20 shrink-0 rounded-xl border-2 border-line" />}
          <div className="min-w-0">
            <div className="truncate text-[1.1rem] font-extrabold" title={np.track.name}>
              {np.track.name}
            </div>
            <div className="truncate text-muted" title={np.track.artists.join(', ')}>
              {np.track.artists.join(', ')}
            </div>
          </div>
        </div>
        <canvas ref={canvas} width={320} height={90} className="h-[90px] w-full" aria-label="Audio visualiser" />
        {status === 'unavailable' && <p className="text-center text-[0.75rem] font-bold text-muted">Audio capture unavailable</p>}
        <ProgressBar state={state} np={np} progress={progress} />
        <Controls state={state} np={np} />
      </div>
    </div>
  )
}
