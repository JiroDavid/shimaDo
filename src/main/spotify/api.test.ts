import { describe, it, expect } from 'vitest'
import { AuthLostError, ControlError, SpotifyApi, SpotifyApiError, type TokenSource } from './api'

const track = (over: Record<string, unknown> = {}) => ({
  id: 't1',
  name: 'Song',
  type: 'track',
  duration_ms: 200_000,
  artists: [{ name: 'A' }, { name: 'B' }],
  album: { name: 'Album', images: [{ url: 'big.jpg' }, { url: 'small.jpg' }] },
  ...over
})

function setup(responses: Response[]) {
  const calls: { url: string; auth: string | null; method?: string }[] = []
  const queue = [...responses]
  const fetchFn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, auth: new Headers(init?.headers).get('authorization'), method: init?.method })
    const next = queue.shift()
    if (!next) throw new Error('unexpected request')
    return next
  }) as unknown as typeof fetch
  let refreshes = 0
  const tokens: TokenSource = {
    accessToken: async () => 'tok-old',
    refresh: async () => {
      refreshes++
      return 'tok-new'
    }
  }
  return { api: new SpotifyApi(tokens, fetchFn), calls, refreshes: () => refreshes }
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers })

describe('SpotifyApi.nowPlaying', () => {
  it('maps a playing track and sends the bearer token', async () => {
    const { api, calls } = setup([json({ is_playing: true, progress_ms: 5000, device: { name: 'Desk', volume_percent: 40 }, item: track() })])
    const np = await api.nowPlaying()
    expect(np).toMatchObject({ playing: true, progressMs: 5000, device: { name: 'Desk', volumePercent: 40 }, track: { id: 't1', name: 'Song', artists: ['A', 'B'], album: 'Album', art: 'big.jpg', durationMs: 200_000 } })
    expect(typeof np?.fetchedAt).toBe('number')
    expect(calls[0].url).toBe('https://api.spotify.com/v1/me/player')
    expect(calls[0].auth).toBe('Bearer tok-old')
  })
  it('has no device when the response lacks one and tolerates a missing volume', async () => {
    const { api } = setup([json({ is_playing: true, item: track() }), json({ is_playing: true, item: track(), device: { name: 'Phone' } })])
    expect((await api.nowPlaying())?.device).toBeNull()
    expect((await api.nowPlaying())?.device).toEqual({ name: 'Phone', volumePercent: null })
  })
  it('treats ads as nothing playing', async () => {
    const { api } = setup([json({ is_playing: true, currently_playing_type: 'ad', item: track() })])
    expect(await api.nowPlaying()).toBeNull()
  })
  it('returns null on 204, on a null item and for podcast episodes', async () => {
    const { api } = setup([new Response(null, { status: 204 }), json({ is_playing: true, item: null }), json({ is_playing: true, item: track({ type: 'episode' }) })])
    expect(await api.nowPlaying()).toBeNull()
    expect(await api.nowPlaying()).toBeNull()
    expect(await api.nowPlaying()).toBeNull()
  })
  it('tolerates a track without album art or progress', async () => {
    const { api } = setup([json({ is_playing: false, item: track({ album: { name: 'X', images: [] } }) })])
    const np = await api.nowPlaying()
    expect(np?.track.art).toBeNull()
    expect(np?.progressMs).toBe(0)
    expect(np?.playing).toBe(false)
  })
  it('refreshes once on 401 and retries with the new token', async () => {
    const { api, calls, refreshes } = setup([new Response(null, { status: 401 }), json({ is_playing: true, progress_ms: 1, item: track() })])
    expect((await api.nowPlaying())?.track.id).toBe('t1')
    expect(refreshes()).toBe(1)
    expect(calls[1].auth).toBe('Bearer tok-new')
  })
  it('throws AuthLostError when the retry is still 401', async () => {
    const { api } = setup([new Response(null, { status: 401 }), new Response(null, { status: 401 })])
    await expect(api.nowPlaying()).rejects.toBeInstanceOf(AuthLostError)
  })
  it('reports rate limiting with the advertised wait', async () => {
    const { api } = setup([new Response(null, { status: 429, headers: { 'retry-after': '7' } })])
    await expect(api.nowPlaying()).rejects.toMatchObject({ status: 429, retryAfterMs: 7000 })
  })
  it('throws SpotifyApiError for other failures', async () => {
    const { api } = setup([new Response(null, { status: 503 })])
    await expect(api.nowPlaying()).rejects.toBeInstanceOf(SpotifyApiError)
  })
})

describe('SpotifyApi.recentlyPlayed', () => {
  it('maps plays, parses played_at and skips entries without a track id', async () => {
    const { api, calls } = setup([
      json({
        items: [
          { played_at: '2026-10-05T12:00:00.000Z', track: track() },
          { played_at: '2026-10-05T12:05:00.000Z', track: track({ id: null }) },
          { played_at: 'garbage', track: track() },
          { track: track() }
        ]
      })
    ])
    const plays = await api.recentlyPlayed()
    expect(plays).toEqual([{ at: Date.parse('2026-10-05T12:00:00.000Z'), id: 't1', name: 'Song', artists: ['A', 'B'], durationMs: 200_000 }])
    expect(calls[0].url).toBe('https://api.spotify.com/v1/me/player/recently-played?limit=50')
  })
  it('returns an empty list when there is no body items array', async () => {
    const { api } = setup([json({})])
    expect(await api.recentlyPlayed()).toEqual([])
  })
})

describe('SpotifyApi.control', () => {
  const ok = () => new Response(null, { status: 204 })
  const errBody = (status: number, reason: string, message = 'x') => new Response(JSON.stringify({ error: { status, message, reason } }), { status })

  it.each([
    [{ type: 'play' as const }, 'PUT', '/me/player/play'],
    [{ type: 'pause' as const }, 'PUT', '/me/player/pause'],
    [{ type: 'next' as const }, 'POST', '/me/player/next'],
    [{ type: 'previous' as const }, 'POST', '/me/player/previous'],
    [{ type: 'seek' as const, positionMs: 12_345.6 }, 'PUT', '/me/player/seek?position_ms=12346'],
    [{ type: 'seek' as const, positionMs: -50 }, 'PUT', '/me/player/seek?position_ms=0'],
    [{ type: 'volume' as const, percent: 41.4 }, 'PUT', '/me/player/volume?volume_percent=41'],
    [{ type: 'volume' as const, percent: 250 }, 'PUT', '/me/player/volume?volume_percent=100'],
    [{ type: 'volume' as const, percent: -3 }, 'PUT', '/me/player/volume?volume_percent=0']
  ])('sends %j as %s %s', async (action, method, path) => {
    const t = setup([ok()])
    await t.api.control(action)
    expect(t.calls[0].url).toBe(`https://api.spotify.com/v1${path}`)
    expect(t.calls[0].method).toBe(method)
    expect(t.calls[0].auth).toBe('Bearer tok-old')
  })

  it('refreshes once on 401 and retries', async () => {
    const t = setup([new Response(null, { status: 401 }), ok()])
    await t.api.control({ type: 'pause' })
    expect(t.refreshes()).toBe(1)
    expect(t.calls[1].auth).toBe('Bearer tok-new')
  })

  it('maps Spotify errors to readable control errors', async () => {
    const cases: [Response, string, string][] = [
      [errBody(403, 'PREMIUM_REQUIRED'), 'premium', 'Controls need Spotify Premium'],
      [errBody(404, 'NO_ACTIVE_DEVICE'), 'no-device', 'Open Spotify on a device first'],
      [new Response(null, { status: 404 }), 'no-device', 'Open Spotify on a device first'],
      [errBody(403, 'VOLUME_CONTROL_DISALLOW'), 'volume', 'This device does not allow volume control'],
      [errBody(403, '', 'Insufficient client scope'), 'scope', 'Reconnect to enable controls'],
      [new Response('oops', { status: 500 }), 'other', 'Spotify could not do that (500)']
    ]
    for (const [res, kind, message] of cases) {
      const err = await setup([res]).api.control({ type: 'next' }).catch((e) => e)
      expect(err).toBeInstanceOf(ControlError)
      expect(err).toMatchObject({ kind, message })
    }
  })

  it('reports rate limiting and lost access like the other calls', async () => {
    await expect(setup([new Response(null, { status: 429, headers: { 'retry-after': '3' } })]).api.control({ type: 'play' })).rejects.toMatchObject({ status: 429, retryAfterMs: 3000 })
    await expect(setup([new Response(null, { status: 401 }), new Response(null, { status: 401 })]).api.control({ type: 'play' })).rejects.toBeInstanceOf(AuthLostError)
  })
})
