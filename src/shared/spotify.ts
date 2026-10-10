export const SPOTIFY_REDIRECT_PORT = 53682
export const SPOTIFY_REDIRECT_URI = `http://127.0.0.1:${SPOTIFY_REDIRECT_PORT}/callback`
export const SPOTIFY_DASHBOARD_URL = 'https://developer.spotify.com/dashboard'
export const CONTROL_SCOPE = 'user-modify-playback-state'
export const SPOTIFY_SCOPES = ['user-read-currently-playing', 'user-read-playback-state', 'user-read-recently-played', CONTROL_SCOPE]
export const NOW_PLAYING_MS = 5_000
export const IDLE_POLL_MS = 15_000
export const HISTORY_POLL_MS = 10 * 60 * 1000
export const MAX_PLAYS = 50_000
export const CLIENT_ID_PATTERN = /^[0-9a-f]{32}$/i

export interface Track {
  id: string
  name: string
  artists: string[]
  album: string
  art: string | null
  durationMs: number
}

export interface NowPlaying {
  track: Track
  progressMs: number
  playing: boolean
  device: { name: string; volumePercent: number | null } | null
  fetchedAt: number
}

export type ControlAction =
  | { type: 'play' | 'pause' | 'next' | 'previous' }
  | { type: 'seek'; positionMs: number }
  | { type: 'volume'; percent: number }

export interface Play {
  at: number
  id: string
  name: string
  artists: string[]
  durationMs: number
}

export type SpotifyStyle = 'classic' | 'compact' | 'visualizer'
export const SPOTIFY_STYLES: SpotifyStyle[] = ['classic', 'compact', 'visualizer']

export function parseControlAction(raw: unknown): ControlAction | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (r.type === 'play' || r.type === 'pause' || r.type === 'next' || r.type === 'previous') return { type: r.type }
  if (r.type === 'seek' && typeof r.positionMs === 'number' && Number.isFinite(r.positionMs)) return { type: 'seek', positionMs: r.positionMs }
  if (r.type === 'volume' && typeof r.percent === 'number' && Number.isFinite(r.percent)) return { type: 'volume', percent: r.percent }
  return null
}

export type SpotifyStatus = 'no-client' | 'disconnected' | 'connecting' | 'connected'

export interface SpotifyState {
  status: SpotifyStatus
  nowPlaying: NowPlaying | null
  offline: boolean
  error: string | null
  canControl: boolean
  premiumRequired: boolean
  controlError: string | null
}

export type StatsRange = '7d' | '30d' | 'all'

export interface Stats {
  plays: number
  totalMs: number
  topArtists: { name: string; plays: number }[]
  topTracks: { name: string; artist: string; plays: number }[]
  perDay: { date: string; minutes: number }[]
}
