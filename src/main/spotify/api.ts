import type { NowPlaying, Play, Track } from '../../shared/spotify'

const BASE = 'https://api.spotify.com/v1'

export class AuthLostError extends Error {
  constructor() {
    super('Spotify access was revoked')
  }
}

export class SpotifyApiError extends Error {
  constructor(readonly status: number, message: string, readonly retryAfterMs?: number) {
    super(message)
  }
}

export interface TokenSource {
  accessToken(): Promise<string>
  refresh(): Promise<string>
}

interface RawTrack {
  id?: unknown
  name?: unknown
  type?: unknown
  duration_ms?: unknown
  artists?: { name?: unknown }[]
  album?: { name?: unknown; images?: { url?: unknown }[] }
}

function parseTrack(raw: RawTrack | null | undefined): Track | null {
  if (!raw || raw.type === 'episode' || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null
  const art = raw.album?.images?.[0]?.url
  return {
    id: raw.id,
    name: raw.name,
    artists: (raw.artists ?? []).map((a) => a.name).filter((n): n is string => typeof n === 'string'),
    album: typeof raw.album?.name === 'string' ? raw.album.name : '',
    art: typeof art === 'string' ? art : null,
    durationMs: typeof raw.duration_ms === 'number' ? raw.duration_ms : 0
  }
}

export class SpotifyApi {
  constructor(private tokens: TokenSource, private fetchFn: typeof fetch = fetch) {}

  async nowPlaying(): Promise<NowPlaying | null> {
    const res = await this.get('/me/player/currently-playing')
    if (!res) return null
    const body = (await res.json()) as { is_playing?: unknown; progress_ms?: unknown; item?: RawTrack | null }
    const track = parseTrack(body.item)
    if (!track) return null
    return {
      track,
      progressMs: typeof body.progress_ms === 'number' ? body.progress_ms : 0,
      playing: body.is_playing === true,
      fetchedAt: Date.now()
    }
  }

  async recentlyPlayed(): Promise<Play[]> {
    const res = await this.get('/me/player/recently-played?limit=50')
    if (!res) return []
    const body = (await res.json()) as { items?: { played_at?: unknown; track?: RawTrack }[] }
    const plays: Play[] = []
    for (const item of body.items ?? []) {
      const track = parseTrack(item.track)
      const at = typeof item.played_at === 'string' ? Date.parse(item.played_at) : NaN
      if (track && Number.isFinite(at)) plays.push({ at, id: track.id, name: track.name, artists: track.artists, durationMs: track.durationMs })
    }
    return plays
  }

  private async get(path: string): Promise<Response | null> {
    const request = async (token: string) => this.fetchFn(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
    let res = await request(await this.tokens.accessToken())
    if (res.status === 401) {
      res = await request(await this.tokens.refresh())
      if (res.status === 401) throw new AuthLostError()
    }
    if (res.status === 429) throw new SpotifyApiError(429, 'Spotify is rate limiting requests', (Number(res.headers.get('retry-after')) || 5) * 1000)
    if (res.status === 204) return null
    if (!res.ok) throw new SpotifyApiError(res.status, `Spotify returned ${res.status}`)
    return res
  }
}
