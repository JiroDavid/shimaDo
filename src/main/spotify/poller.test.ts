import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NowPlaying } from '../../shared/spotify'
import { AuthLostError, SpotifyApiError } from './api'
import { NowPlayingPoller } from './poller'

const np = (playing: boolean): NowPlaying => ({
  track: { id: 't', name: 'S', artists: ['A'], album: 'X', art: null, durationMs: 1000 },
  progressMs: 0,
  device: null,
  playing,
  fetchedAt: 0
})

function setup(results: (() => Promise<NowPlaying | null>)[]) {
  const updates: [NowPlaying | null, boolean][] = []
  let lost = 0
  let calls = 0
  const poller = new NowPlayingPoller({
    fetchNow: () => {
      const next = results[Math.min(calls, results.length - 1)]
      calls++
      return next()
    },
    onUpdate: (n, offline) => updates.push([n, offline]),
    onAuthLost: () => lost++
  })
  return { poller, updates, calls: () => calls, lost: () => lost }
}

describe('NowPlayingPoller', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('polls immediately, every 5s while playing and every 15s otherwise', async () => {
    const t = setup([async () => np(true), async () => np(true), async () => null, async () => null])
    t.poller.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(t.calls()).toBe(1)
    await vi.advanceTimersByTimeAsync(5000)
    expect(t.calls()).toBe(2)
    await vi.advanceTimersByTimeAsync(5000)
    expect(t.calls()).toBe(3)
    await vi.advanceTimersByTimeAsync(14_999)
    expect(t.calls()).toBe(3)
    await vi.advanceTimersByTimeAsync(1)
    expect(t.calls()).toBe(4)
    expect(t.updates.map((u) => u[0]?.playing ?? null)).toEqual([true, true, null, null])
  })

  it('treats a paused track like idle for cadence', async () => {
    const t = setup([async () => np(false)])
    t.poller.start()
    await vi.advanceTimersByTimeAsync(5000)
    expect(t.calls()).toBe(1)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(t.calls()).toBe(2)
  })

  it('stops polling and ignores late results after stop', async () => {
    let release!: (n: NowPlaying | null) => void
    const t = setup([() => new Promise((r) => (release = r))])
    t.poller.start()
    await vi.advanceTimersByTimeAsync(0)
    t.poller.stop()
    release(np(true))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(t.calls()).toBe(1)
    expect(t.updates).toHaveLength(0)
  })

  it('start is idempotent and restart does not double the loop', async () => {
    const t = setup([async () => null])
    t.poller.start()
    t.poller.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(t.calls()).toBe(1)
    t.poller.stop()
    t.poller.start()
    await vi.advanceTimersByTimeAsync(15_000)
    expect(t.calls()).toBe(3)
  })

  it('shows the last known track as offline on a network error and keeps polling', async () => {
    const t = setup([async () => np(true), async () => { throw new TypeError('fetch failed') }, async () => np(true)])
    t.poller.start()
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(5000)
    expect(t.updates[1][1]).toBe(true)
    expect(t.updates[1][0]?.track.id).toBe('t')
    await vi.advanceTimersByTimeAsync(15_000)
    expect(t.updates[2]).toEqual([np(true), false])
  })

  it('waits the advertised time after a 429 and does not report offline', async () => {
    const t = setup([async () => { throw new SpotifyApiError(429, 'slow down', 30_000) }, async () => null])
    t.poller.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(t.updates).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(29_999)
    expect(t.calls()).toBe(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(t.calls()).toBe(2)
  })

  it('stops and reports when access is lost', async () => {
    const t = setup([async () => { throw new AuthLostError() }])
    t.poller.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(t.lost()).toBe(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(t.calls()).toBe(1)
  })
})
