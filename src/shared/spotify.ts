export const SPOTIFY_REDIRECT_PORT = 53682
export const SPOTIFY_REDIRECT_URI = `http://127.0.0.1:${SPOTIFY_REDIRECT_PORT}/callback`
export const SPOTIFY_DASHBOARD_URL = 'https://developer.spotify.com/dashboard'
export const SPOTIFY_SCOPES = ['user-read-currently-playing', 'user-read-playback-state', 'user-read-recently-played']
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
  fetchedAt: number
}

export interface Play {
  at: number
  id: string
  name: string
  artists: string[]
  durationMs: number
}

export type SpotifyStatus = 'no-client' | 'disconnected' | 'connecting' | 'connected'

export interface SpotifyState {
  status: SpotifyStatus
  nowPlaying: NowPlaying | null
  offline: boolean
  error: string | null
}

export type StatsRange = '7d' | '30d' | 'all'

export interface Stats {
  plays: number
  totalMs: number
  topArtists: { name: string; plays: number }[]
  topTracks: { name: string; artist: string; plays: number }[]
  perDay: { date: string; minutes: number }[]
}
