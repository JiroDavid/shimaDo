import { addDays, isValidDateKey, weekDays, weekStart, weekdayOf } from './dates'
import type { Gym, GymDay, GymSet, GymSetInput } from './types'

export const emptyGym = (): Gym => ({ splits: [], overrides: {}, done: {}, sets: [], weighIns: {} })

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

export function e1rm(weightKg: number, reps: number): number {
  const value = reps <= 1 ? weightKg : weightKg * (1 + reps / 30)
  return Math.round(value * 10) / 10
}

export function exerciseNames(gym: Gym): string[] {
  const seen = new Map<string, string>()
  const add = (name: string) => {
    if (!seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name)
  }
  for (const split of gym.splits) for (const day of split.days) day?.exercises.forEach(add)
  gym.sets.forEach((s) => add(s.exercise))
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

export function canonicalExercise(gym: Gym, name: string): string {
  return exerciseNames(gym).find((n) => n.toLowerCase() === name.toLowerCase()) ?? name
}

export function strengthSeries(gym: Gym, exercise: string): { date: string; e1rm: number }[] {
  const best = new Map<string, number>()
  for (const s of gym.sets) {
    if (s.exercise !== exercise) continue
    best.set(s.date, Math.max(best.get(s.date) ?? 0, e1rm(s.weightKg, s.reps)))
  }
  return [...best].map(([date, value]) => ({ date, e1rm: value })).sort((a, b) => a.date.localeCompare(b.date))
}

export function latestWeightOnOrBefore(weighIns: Record<string, number>, key: string): number | null {
  let best: string | null = null
  for (const k of Object.keys(weighIns)) if (k <= key && (best === null || k > best)) best = k
  return best === null ? null : weighIns[best]
}

export const latestWeight = (weighIns: Record<string, number>): number | null => latestWeightOnOrBefore(weighIns, '9999-12-31')

export function relativeStrength(gym: Gym, exercise: string): { date: string; ratio: number }[] {
  return strengthSeries(gym, exercise).flatMap((p) => {
    const weight = latestWeightOnOrBefore(gym.weighIns, p.date)
    return weight === null ? [] : [{ date: p.date, ratio: Math.round((p.e1rm / weight) * 100) / 100 }]
  })
}

export function weightTrend(weighIns: Record<string, number>, keys: string[]): { raw: (number | null)[]; trend: (number | null)[] } {
  const raw = keys.map((k) => weighIns[k] ?? null)
  const trend = keys.map((k) => {
    const window = Array.from({ length: 7 }, (_, i) => weighIns[addDays(k, -i)]).filter((v): v is number => v !== undefined)
    return window.length === 0 ? null : Math.round((window.reduce((a, b) => a + b, 0) / window.length) * 10) / 10
  })
  return { raw, trend }
}

export function unplannedSets(gym: Gym, date: string, plan: GymDay | null): GymSet[] {
  const planned = new Set((plan?.exercises ?? []).map((e) => e.toLowerCase()))
  return gym.sets.filter((s) => s.date === date && !planned.has(s.exercise.toLowerCase()))
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

export function validateSet(i: GymSetInput, todayKey: string): string | null {
  const name = i.exercise.trim()
  if (name === '' || name.length > 60) return 'Exercise name must be 1-60 characters'
  if (!isValidDateKey(i.date) || i.date > todayKey) return 'Pick a date that is not in the future'
  if (!(Number.isFinite(i.weightKg) && i.weightKg > 0 && i.weightKg <= 1000)) return 'Weight must be above 0 and at most 1000 kg'
  if (!(Number.isInteger(i.reps) && i.reps >= 1 && i.reps <= 50)) return 'Reps must be a whole number from 1 to 50'
  return null
}

export function validateWeighIn(kg: number): string | null {
  return Number.isFinite(kg) && kg >= 20 && kg <= 500 ? null : 'Weight must be 20-500 kg'
}
