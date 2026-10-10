import fs from 'node:fs'
import { toDateKey } from '../../shared/dates'
import { MAX_PLAYS, type Play, type Stats, type StatsRange } from '../../shared/spotify'

const DAY_MS = 86_400_000
const TOP_N = 5
const CHART_DAYS = { '7d': 7, '30d': 30, all: 30 } as const

export function cleanPlays(raw: unknown): Play[] {
  if (!Array.isArray(raw)) return []
  const out: Play[] = []
  for (const r of raw) {
    if (typeof r !== 'object' || r === null) continue
    const p = r as Record<string, unknown>
    if (typeof p.at !== 'number' || !Number.isFinite(p.at)) continue
    if (typeof p.id !== 'string' || p.id === '' || typeof p.name !== 'string') continue
    if (!Array.isArray(p.artists) || !p.artists.every((a) => typeof a === 'string')) continue
    if (typeof p.durationMs !== 'number' || !(p.durationMs >= 0)) continue
    out.push({ at: p.at, id: p.id, name: p.name, artists: p.artists as string[], durationMs: p.durationMs })
  }
  return out
}

export function mergePlays(existing: Play[], incoming: Play[]): { plays: Play[]; added: number } {
  const seen = new Set(existing.map((p) => `${p.at}:${p.id}`))
  const fresh: Play[] = []
  for (const p of incoming) {
    const key = `${p.at}:${p.id}`
    if (seen.has(key)) continue
    seen.add(key)
    fresh.push(p)
  }
  const plays = [...existing, ...fresh].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
  return { plays: plays.length > MAX_PLAYS ? plays.slice(plays.length - MAX_PLAYS) : plays, added: fresh.length }
}

const rank = <T extends { plays: number }>(items: T[], name: (t: T) => string): T[] =>
  items.sort((a, b) => b.plays - a.plays || name(a).localeCompare(name(b))).slice(0, TOP_N)

export function computeStats(plays: Play[], range: StatsRange, now: number): Stats {
  const from = range === 'all' ? -Infinity : now - (range === '7d' ? 7 : 30) * DAY_MS
  const inRange = plays.filter((p) => p.at >= from && p.at <= now)
  const artists = new Map<string, number>()
  const tracks = new Map<string, { name: string; artist: string; plays: number }>()
  let totalMs = 0
  for (const p of inRange) {
    totalMs += p.durationMs
    for (const a of p.artists) artists.set(a, (artists.get(a) ?? 0) + 1)
    const t = tracks.get(p.id) ?? { name: p.name, artist: p.artists[0] ?? '', plays: 0 }
    t.plays++
    tracks.set(p.id, t)
  }
  const days = CHART_DAYS[range]
  const perDay = Array.from({ length: days }, (_, i) => ({ date: toDateKey(new Date(now - (days - 1 - i) * DAY_MS)), minutes: 0 }))
  const byDate = new Map(perDay.map((d) => [d.date, d]))
  for (const p of plays) {
    if (p.at > now) continue
    const day = byDate.get(toDateKey(new Date(p.at)))
    if (day) day.minutes += p.durationMs / 60_000
  }
  return {
    plays: inRange.length,
    totalMs,
    topArtists: rank([...artists].map(([name, n]) => ({ name, plays: n })), (a) => a.name),
    topTracks: rank([...tracks.values()], (t) => t.name),
    perDay
  }
}

export class HistoryStore {
  plays: Play[] = []

  constructor(private file: string) {}

  load(): void {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8')) as { plays?: unknown }
      this.plays = mergePlays([], cleanPlays(raw.plays)).plays
    } catch {
      this.plays = []
    }
  }

  add(incoming: Play[]): number {
    const { plays, added } = mergePlays(this.plays, incoming)
    this.plays = plays
    if (added > 0) {
      const tmp = `${this.file}.tmp`
      fs.writeFileSync(tmp, JSON.stringify({ plays }))
      fs.renameSync(tmp, this.file)
    }
    return added
  }
}
