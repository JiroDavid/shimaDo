import { addDays, weekDays, weekStart, weekdayOf } from './dates'
import type { Gym, GymDay } from './types'

export const emptyGym = (): Gym => ({ splits: [], overrides: {}, done: {}, weighIns: {} })

export function templateFor(gym: Gym, key: string): (GymDay | null)[] {
  let days: (GymDay | null)[] = []
  for (const split of gym.splits) if (split.from <= key) days = split.days
  return days
}

export function dayPlan(gym: Gym, key: string): GymDay | null {
  if (Object.hasOwn(gym.overrides, key)) return gym.overrides[key]
  return templateFor(gym, key)[weekdayOf(key)] ?? null
}

export function weeklyConsistency(gym: Gym, todayKey: string, weeks: number): { weekStart: string; planned: number; done: number }[] {
  const current = weekStart(todayKey)
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(current, -7 * (weeks - 1 - i))
    const planned = weekDays(start).filter((k) => k <= todayKey && dayPlan(gym, k) !== null)
    return { weekStart: start, planned: planned.length, done: planned.filter((k) => gym.done[k]).length }
  })
}

export function latestWeightOnOrBefore(weighIns: Record<string, number>, key: string): number | null {
  let best: string | null = null
  for (const k of Object.keys(weighIns)) if (k <= key && (best === null || k > best)) best = k
  return best === null ? null : weighIns[best]
}

export const latestWeight = (weighIns: Record<string, number>): number | null => latestWeightOnOrBefore(weighIns, '9999-12-31')

export function weightTrend(weighIns: Record<string, number>, keys: string[]): { raw: (number | null)[]; trend: (number | null)[] } {
  const raw = keys.map((k) => weighIns[k] ?? null)
  const trend = keys.map((k) => {
    const window = Array.from({ length: 7 }, (_, i) => weighIns[addDays(k, -i)]).filter((v): v is number => v !== undefined)
    return window.length === 0 ? null : Math.round((window.reduce((a, b) => a + b, 0) / window.length) * 10) / 10
  })
  return { raw, trend }
}

export function normalizeDay(day: GymDay): GymDay {
  return { label: day.label.trim(), exercises: day.exercises.map((e) => e.trim()).filter((e) => e !== '') }
}

export function normalizeDays(days: (GymDay | null)[]): (GymDay | null)[] {
  return days.map((d) => (d === null || d.label.trim() === '' ? null : normalizeDay(d)))
}

export function validateGymDay(day: GymDay): string | null {
  if (day.label.length < 1 || day.label.length > 24) return 'Day label must be 1-24 characters'
  if (day.exercises.length > 20) return 'At most 20 exercises per day'
  if (day.exercises.some((e) => e.length > 60)) return 'Exercise names must be 60 characters or fewer'
  return null
}

export function validateGymDays(days: (GymDay | null)[]): string | null {
  if (days.length !== 7) return 'A split needs 7 days'
  for (const d of days) {
    const problem = d === null ? null : validateGymDay(d)
    if (problem) return problem
  }
  return null
}

export function validateWeighIn(kg: number): string | null {
  return Number.isFinite(kg) && kg >= 20 && kg <= 500 ? null : 'Weight must be 20-500 kg'
}
