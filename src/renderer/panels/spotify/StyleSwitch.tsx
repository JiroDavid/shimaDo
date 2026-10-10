import { SPOTIFY_STYLES, type SpotifyStyle } from '../../../shared/spotify'

const LABELS: Record<SpotifyStyle, string> = { classic: 'Classic', compact: 'Compact', visualizer: 'Visual' }

export function StyleSwitch({ value }: { value: SpotifyStyle }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Player style">
      {SPOTIFY_STYLES.map((s) => (
        <button key={s} role="radio" aria-checked={value === s} className={`btn !min-h-[26px] !px-2 !py-0 !text-[0.75rem] ${value === s ? 'btn-active' : ''}`} onClick={() => window.shima.setSettings({ spotifyStyle: s })}>
          {LABELS[s]}
        </button>
      ))}
    </div>
  )
}
