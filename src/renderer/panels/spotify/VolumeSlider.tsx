import { useEffect, useRef, useState } from 'react'
import type { NowPlaying, SpotifyState } from '../../../shared/spotify'

export function VolumeSlider({ state, np }: { state: SpotifyState; np: NowPlaying }) {
  const reported = np.device?.volumePercent ?? null
  const [value, setValue] = useState(reported ?? 0)
  const dragging = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!dragging.current && reported !== null) setValue(reported)
  }, [reported, np.fetchedAt])
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  if (reported === null) return null
  const blocked = !state.canControl || state.premiumRequired
  const change = (v: number) => {
    setValue(v)
    dragging.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      window.shima.spotifyControl({ type: 'volume', percent: v })
      dragging.current = false
    }, 150)
  }
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={value}
      disabled={blocked}
      aria-label="Spotify volume"
      onChange={(e) => change(Number(e.target.value))}
      className={`w-full ${blocked ? 'opacity-40' : ''}`}
      style={{ accentColor: 'var(--accent)' }}
    />
  )
}
