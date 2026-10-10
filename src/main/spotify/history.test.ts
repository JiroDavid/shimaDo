import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { MAX_PLAYS, type Play } from '../../shared/spotify'
import { cleanPlays, computeStats, HistoryStore, mergePlays } from './history'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 9, 10, 18, 0, 0)
const play = (at: number, id = 't1', artists = ['A'], durationMs = 180_000, name = id): Play => ({ at, id, name, artists, durationMs })

describe('cleanPlays', () => {
  it('keeps valid entries and drops malformed ones', () => {
    const good = play(1000)
    expect(cleanPlays([good, null, 5, { at: 'x' }, { ...good, id: '' }, { ...good, artists: 'A' }, { ...good, durationMs: -1 }])).toEqual([good])
    expect(cleanPlays('nope')).toEqual([])
  })
})

describe('mergePlays', () => {
  it('de-duplicates by time and track, sorts ascending and counts new plays', () => {
    const a = play(2000, 'a')
    const b = play(1000, 'b')
    const first = mergePlays([], [a, b])
    expect(first.plays.map((p) => p.id)).toEqual(['b', 'a'])
    expect(first.added).toBe(2)
    const second = mergePlays(first.plays, [a, play(3000, 'c')])
    expect(second.added).toBe(1)
    expect(second.plays).toHaveLength(3)
  })
  it('keeps two different tracks played at the same instant', () => {
    expect(mergePlays([play(1000, 'a')], [play(1000, 'b')]).plays).toHaveLength(2)
  })
  it('caps the history at the newest MAX_PLAYS', () => {
    const many = Array.from({ length: MAX_PLAYS + 10 }, (_, i) => play(i + 1, `t${i}`))
    const { plays } = mergePlays([], many)
    expect(plays).toHaveLength(MAX_PLAYS)
    expect(plays[0].at).toBe(11)
  })
})

describe('computeStats', () => {
  const plays = [
    play(NOW - 1 * DAY, 's1', ['A', 'B'], 120_000, 'One'),
    play(NOW - 1 * DAY + 1000, 's1', ['A', 'B'], 120_000, 'One'),
    play(NOW - 2 * DAY, 's2', ['A'], 60_000, 'Two'),
    play(NOW - 20 * DAY, 's3', ['C'], 300_000, 'Three'),
    play(NOW - 100 * DAY, 's4', ['C'], 300_000, 'Four')
  ]
  it('filters by range', () => {
    expect(computeStats(plays, '7d', NOW).plays).toBe(3)
    expect(computeStats(plays, '30d', NOW).plays).toBe(4)
    expect(computeStats(plays, 'all', NOW).plays).toBe(5)
  })
  it('sums listening time and ranks artists and tracks by plays', () => {
    const s = computeStats(plays, '7d', NOW)
    expect(s.totalMs).toBe(300_000)
    expect(s.topArtists).toEqual([{ name: 'A', plays: 3 }, { name: 'B', plays: 2 }])
    expect(s.topTracks).toEqual([{ name: 'One', artist: 'A', plays: 2 }, { name: 'Two', artist: 'A', plays: 1 }])
  })
  it('breaks ties alphabetically and returns at most five', () => {
    const tied = ['e', 'd', 'c', 'b', 'a', 'f'].map((n, i) => play(NOW - i * 1000, n, [n.toUpperCase()], 1000, n))
    const s = computeStats(tied, 'all', NOW)
    expect(s.topArtists.map((a) => a.name)).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(s.topTracks).toHaveLength(5)
  })
  it('builds a zero-filled minutes-per-day series ending today', () => {
    const s = computeStats(plays, '7d', NOW)
    expect(s.perDay).toHaveLength(7)
    expect(s.perDay.at(-1)?.date).toBe('2026-10-10')
    expect(s.perDay.reduce((n, d) => n + d.minutes, 0)).toBeCloseTo(5, 5)
    expect(computeStats(plays, '30d', NOW).perDay).toHaveLength(30)
    expect(computeStats(plays, 'all', NOW).perDay).toHaveLength(30)
  })
  it('handles an empty history', () => {
    expect(computeStats([], '7d', NOW)).toMatchObject({ plays: 0, totalMs: 0, topArtists: [], topTracks: [] })
  })
})

describe('HistoryStore', () => {
  const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shima-hist-')), 'h.json')
  it('persists merged plays and reloads them', () => {
    const file = tmp()
    const a = new HistoryStore(file)
    a.load()
    expect(a.add([play(1000, 'a'), play(2000, 'b')])).toBe(2)
    expect(a.add([play(2000, 'b')])).toBe(0)
    const b = new HistoryStore(file)
    b.load()
    expect(b.plays.map((p) => p.id)).toEqual(['a', 'b'])
  })
  it('starts empty when the file is missing or corrupt', () => {
    const file = tmp()
    const a = new HistoryStore(file)
    a.load()
    expect(a.plays).toEqual([])
    fs.writeFileSync(file, '{not json')
    const b = new HistoryStore(file)
    b.load()
    expect(b.plays).toEqual([])
    fs.writeFileSync(file, JSON.stringify({ plays: [play(1000, 'ok'), { bad: true }] }))
    b.load()
    expect(b.plays.map((p) => p.id)).toEqual(['ok'])
  })
})
