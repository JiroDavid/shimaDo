import { addDays, weekDays, weekStart } from './dates'
import { occurrencesOn, type Schedule } from './recurrence'

const MAX_LOOKBACK = 3650

export function doneCountByDay(data: Schedule, keys: string[]): number[] {
  return keys.map((k) => occurrencesOn(data, k).filter((o) => o.done).length)
}

export function consistency(data: Schedule, keys: string[]): (number | null)[] {
  return keys.map((k) => {
    const occ = occurrencesOn(data, k)
    return occ.length === 0 ? null : occ.filter((o) => o.done).length / occ.length
  })
}

function earliestKey(data: Schedule): string | null {
  const keys = data.tasks.map((t) => (t.kind === 'once' && t.date ? t.date : t.createdOn))
  return keys.length === 0 ? null : keys.reduce((a, b) => (a < b ? a : b))
}

export function taskStreak(data: Schedule, todayKey: string): number {
  const earliest = earliestKey(data)
  if (earliest === null) return 0
  let streak = 0
  for (let i = 0; i < MAX_LOOKBACK; i++) {
    const key = addDays(todayKey, -i)
    if (key < earliest) break
    const occ = occurrencesOn(data, key)
    if (occ.length === 0) continue
    if (occ.every((o) => o.done)) streak++
    else if (i > 0) break
  }
  return streak
}

export function nicotineStreak(nic: Record<string, true>, todayKey: string): number {
  let streak = 0
  for (let i = 0; i < MAX_LOOKBACK; i++) {
    if (nic[addDays(todayKey, -i)]) streak++
    else if (i > 0) break
  }
  return streak
}

export function nicotineWeeks(nic: Record<string, true>, todayKey: string, weeks: number) {
  const current = weekStart(todayKey)
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(current, -7 * (weeks - 1 - i))
    return { weekStart: start, count: weekDays(start).filter((k) => nic[k]).length }
  })
}

export function pomodoroStreak(p: Record<string, number>, todayKey: string): number {
  let streak = 0
  for (let i = 0; i < MAX_LOOKBACK; i++) {
    if ((p[addDays(todayKey, -i)] ?? 0) > 0) streak++
    else if (i > 0) break
  }
  return streak
}
