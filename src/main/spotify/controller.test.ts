import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NowPlaying, Play, SpotifyState } from '../../shared/spotify'
import { AuthLostError } from './api'
import { LoginCancelledError } from './auth'
import { SpotifyController } from './controller'

const np: NowPlaying = { track: { id: 't', name: 'S', artists: ['A'], album: 'X', art: null, durationMs: 1000 }, progressMs: 0, device: null, playing: true, fetchedAt: 0 }

function setup(opts: { clientId?: string; connected?: boolean; connect?: () => Promise<void>; onCancel?: () => void; nowPlaying?: () => Promise<NowPlaying | null>; recent?: () => Promise<Play[]> } = {}) {
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
    }),
    cancel: vi.fn(() => opts.onCancel?.())
  }
  const history = { plays: [] as Play[], add: vi.fn((p: Play[]) => p.length) }
  const api = { nowPlaying: opts.nowPlaying ?? (async () => np), recentlyPlayed: opts.recent ?? (async () => [] as Play[]) }
  const c = new SpotifyController({ clientId: () => clientId, auth, api, history, broadcast: (s) => states.push(s) })
  return { c, auth, states, history, setClientId: (v: string) => (clientId = v) }
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

  it('cancel ends a pending connect quietly and allows trying again', async () => {
    let reject!: (e: Error) => void
    const t = setup({ connect: () => new Promise<void>((_, r) => (reject = r)), onCancel: () => reject(new LoginCancelledError()) })
    const pending = t.c.connect()
    expect(t.c.state.status).toBe('connecting')
    t.c.cancel()
    await pending
    expect(t.c.state).toMatchObject({ status: 'disconnected', error: null })
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

describe('history polling', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  const p = (at: number): Play => ({ at, id: 'x', name: 'X', artists: ['A'], durationMs: 1000 })

  it('fetches recent plays on start and every 10 minutes while connected', async () => {
    const recent = vi.fn(async () => [p(1)])
    const t = setup({ connected: true, recent })
    const stop = t.c.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(recent).toHaveBeenCalledTimes(1)
    expect(t.history.add).toHaveBeenCalledWith([p(1)])
    await vi.advanceTimersByTimeAsync(600_000)
    expect(recent).toHaveBeenCalledTimes(2)
    stop()
    await vi.advanceTimersByTimeAsync(1_200_000)
    expect(recent).toHaveBeenCalledTimes(2)
  })

  it('does nothing while disconnected and fetches right after connecting', async () => {
    const recent = vi.fn(async () => [p(1)])
    const t = setup({ recent })
    t.c.start()
    await vi.advanceTimersByTimeAsync(600_000)
    expect(recent).not.toHaveBeenCalled()
    await t.c.connect()
    await vi.advanceTimersByTimeAsync(0)
    expect(recent).toHaveBeenCalledTimes(1)
  })

  it('survives a failing history fetch and tries again next time', async () => {
    let n = 0
    const recent = vi.fn(async () => {
      if (n++ === 0) throw new Error('offline')
      return [p(2)]
    })
    const t = setup({ connected: true, recent })
    t.c.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(t.history.add).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(600_000)
    expect(t.history.add).toHaveBeenCalledWith([p(2)])
  })

  it('treats lost access during a history fetch like a revoked login', async () => {
    const t = setup({ connected: true, recent: async () => { throw new AuthLostError() } })
    t.c.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(t.auth.disconnect).toHaveBeenCalled()
    expect(t.c.state.status).toBe('disconnected')
    expect(t.c.state.error).toMatch(/connect again/i)
  })

  it('computes stats from the stored history', () => {
    const t = setup()
    t.history.plays = [{ at: Date.now() - 1000, id: 'a', name: 'A', artists: ['Z'], durationMs: 60_000 }]
    expect(t.c.stats('7d')).toMatchObject({ plays: 1, totalMs: 60_000, topArtists: [{ name: 'Z', plays: 1 }] })
  })
})
