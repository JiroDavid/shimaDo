import type { ControlAction, NowPlaying, Play, Track } from '../../shared/spotify'

const BASE = 'https://api.spotify.com/v1'

export class AuthLostError extends Error {
  constructor() {
    super('Spotify access was revoked')
  }
}

export class ControlError extends Error {
  constructor(readonly kind: 'premium' | 'no-device' | 'volume' | 'scope' | 'other', message: string) {
    super(message)
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
    const res = await this.get('/me/player')
    if (!res) return null
    const body = (await res.json()) as {
      is_playing?: unknown
      progress_ms?: unknown
      currently_playing_type?: unknown
      device?: { name?: unknown; volume_percent?: unknown } | null
      item?: RawTrack | null
    }
    if (body.currently_playing_type === 'ad') return null
    const track = parseTrack(body.item)
    if (!track) return null
    const device = body.device && typeof body.device.name === 'string' ? { name: body.device.name, volumePercent: typeof body.device.volume_percent === 'number' ? body.device.volume_percent : null } : null
    return {
      track,
      progressMs: typeof body.progress_ms === 'number' ? body.progress_ms : 0,
      playing: body.is_playing === true,
      device,
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

  async control(action: ControlAction): Promise<void> {
    const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)))
    const [method, path] =
      'positionMs' in action
        ? (['PUT', `/me/player/seek?position_ms=${clamp(action.positionMs, 0, Number.MAX_SAFE_INTEGER)}`] as const)
        : 'percent' in action
          ? (['PUT', `/me/player/volume?volume_percent=${clamp(action.percent, 0, 100)}`] as const)
          : action.type === 'next' || action.type === 'previous'
            ? (['POST', `/me/player/${action.type}`] as const)
            : (['PUT', `/me/player/${action.type}`] as const)
    const send = (token: string) => this.fetchFn(`${BASE}${path}`, { method, headers: { Authorization: `Bearer ${token}` } })
    let res = await send(await this.tokens.accessToken())
    if (res.status === 401) {
      res = await send(await this.tokens.refresh())
      if (res.status === 401) throw new AuthLostError()
    }
    if (res.status === 429) throw new SpotifyApiError(429, 'Spotify is rate limiting requests', (Number(res.headers.get('retry-after')) || 5) * 1000)
    if (res.ok) return
    throw await controlError(res)
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

async function controlError(res: Response): Promise<ControlError> {
  let reason = ''
  let message = ''
  try {
    const j = (await res.json()) as { error?: { reason?: unknown; message?: unknown } }
    reason = typeof j.error?.reason === 'string' ? j.error.reason : ''
    message = typeof j.error?.message === 'string' ? j.error.message : ''
  } catch {
    reason = ''
  }
  if (reason === 'PREMIUM_REQUIRED') return new ControlError('premium', 'Controls need Spotify Premium')
  if (reason === 'NO_ACTIVE_DEVICE' || res.status === 404) return new ControlError('no-device', 'Open Spotify on a device first')
  if (reason === 'VOLUME_CONTROL_DISALLOW') return new ControlError('volume', 'This device does not allow volume control')
  if (res.status === 403 && /scope/i.test(message)) return new ControlError('scope', 'Reconnect to enable controls')
  return new ControlError('other', `Spotify could not do that (${res.status})`)
}
