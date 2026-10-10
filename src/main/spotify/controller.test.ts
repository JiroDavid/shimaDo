import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NowPlaying, SpotifyState } from '../../shared/spotify'
import { AuthLostError } from './api'
import { SpotifyController } from './controller'

const np: NowPlaying = { track: { id: 't', name: 'S', artists: ['A'], album: 'X', art: null, durationMs: 1000 }, progressMs: 0, playing: true, fetchedAt: 0 }

function setup(opts: { clientId?: string; connected?: boolean; connect?: () => Promise<void>; nowPlaying?: () => Promise<NowPlaying | null> } = {}) {
  const states: SpotifyState[] = []
  let connected = opts.connected ?? false
  let clientId = opts.clientId ?? 'a'.repeat(32)
  const auth = {
    get connected() {
      return connected
    },
    connect: opts.connect ?? (async () => {
      connected = true
    }),
    disconnect: vi.fn(() => {
      connected = false
    })
  }
  const api = { nowPlaying: opts.nowPlaying ?? (async () => np) }
  const c = new SpotifyController({ clientId: () => clientId, auth, api, broadcast: (s) => states.push(s) })
  return { c, auth, states, setClientId: (v: string) => (clientId = v) }
}

describe('SpotifyController', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('reports no-client, disconnected and connected', () => {
    expect(setup({ clientId: '' }).c.state.status).toBe('no-client')
    expect(setup().c.state.status).toBe('disconnected')
    expect(setup({ connected: true }).c.state.status).toBe('connected')
  })

  it('connect goes through connecting and ends connected', async () => {
    const t = setup()
    await t.c.connect()
    expect(t.states.map((s) => s.status)).toEqual(['connecting', 'connected'])
    expect(t.c.state.error).toBeNull()
  })

  it('connect failure returns to disconnected with the message', async () => {
    const t = setup({ connect: async () => { throw new Error('Spotify authorization was denied') } })
    await t.c.connect()
    expect(t.c.state).toMatchObject({ status: 'disconnected', error: 'Spotify authorization was denied' })
  })

  it('ignores connect without a client id and while already connecting', async () => {
    const t = setup({ clientId: '' })
    await t.c.connect()
    expect(t.states).toHaveLength(0)
    let release!: () => void
    const slow = setup({ connect: () => new Promise<void>((r) => (release = r)) })
    const first = slow.c.connect()
    await slow.c.connect()
    release()
    await first
    expect(slow.states.map((s) => s.status)).toEqual(['connecting', 'disconnected'])
  })

  it('polls only while connected and watched, and publishes the track', async () => {
    const t = setup({ connected: true })
    t.c.setWatching(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(t.c.state.nowPlaying).toEqual(np)
    t.c.setWatching(false)
    t.states.length = 0
    await vi.advanceTimersByTimeAsync(60_000)
    expect(t.states).toHaveLength(0)
  })

  it('does not poll when disconnected even if watched', async () => {
    const fn = vi.fn(async () => np)
    const t = setup({ nowPlaying: fn })
    t.c.setWatching(true)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fn).not.toHaveBeenCalled()
  })

  it('falls back to disconnected with a message when access is revoked', async () => {
    const t = setup({ connected: true, nowPlaying: async () => { throw new AuthLostError() } })
    t.c.setWatching(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(t.auth.disconnect).toHaveBeenCalled()
    expect(t.c.state).toMatchObject({ status: 'disconnected', nowPlaying: null })
    expect(t.c.state.error).toMatch(/connect again/i)
  })

  it('disconnect clears the track, error and stored login', async () => {
    const t = setup({ connected: true })
    t.c.setWatching(true)
    await vi.advanceTimersByTimeAsync(0)
    t.c.disconnect()
    expect(t.auth.disconnect).toHaveBeenCalled()
    expect(t.c.state).toMatchObject({ status: 'disconnected', nowPlaying: null, error: null })
  })

  it('drops the old login when the client id changes', async () => {
    const t = setup({ connected: true })
    t.setClientId('b'.repeat(32))
    t.c.clientIdChanged()
    expect(t.auth.disconnect).toHaveBeenCalled()
    expect(t.c.state.status).toBe('disconnected')
    t.setClientId('')
    t.c.clientIdChanged()
    expect(t.c.state.status).toBe('no-client')
  })
})
