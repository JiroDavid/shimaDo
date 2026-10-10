import { useEffect, useState } from 'react'
import type { NowPlaying } from '../../../shared/spotify'

export function useProgress(np: NowPlaying): number {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!np.playing) return
    const t = setInterval(() => tick((n) => n + 1), 500)
    return () => clearInterval(t)
  }, [np.playing, np.fetchedAt])
  return Math.min(np.track.durationMs, np.progressMs + (np.playing ? Date.now() - np.fetchedAt : 0))
}
