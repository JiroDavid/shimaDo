import { describe, it, expect } from 'vitest'
import { daysBack } from './dates'
import {
  canonicalExercise, dayPlan, e1rm, emptyGym, exerciseNames, latestWeight, normalizeDays,
  relativeStrength, strengthSeries, templateFor, validateGymDays, validateSet, validateWeighIn,
  weeklyConsistency, weightTrend
} from './gym'
import type { Gym, GymDay } from './types'

const day = (label: string, exercises: string[] = []): GymDay => ({ label, exercises })
const week = (monday: GymDay | null = day('Chest+Tri', ['Bench']), tuesday: GymDay | null = day('Back+Bi', ['Row'])) => [
  null, monday, tuesday, null, null, null, null
]
const gymWith = (over: Partial<Gym> = {}): Gym => ({ ...emptyGym(), splits: [{ from: '2026-09-01', days: week() }], ...over })

describe('dayPlan and templateFor', () => {
  it('follows the weekly template', () => {
    expect(dayPlan(gymWith(), '2026-10-05')?.label).toBe('Chest+Tri')
    expect(dayPlan(gymWith(), '2026-10-07')).toBeNull()
  })
  it('has no plan before the first split starts', () => {
    expect(dayPlan(gymWith(), '2026-08-31')).toBeNull()
    expect(templateFor(gymWith(), '2026-08-01')).toEqual([])
  })
  it('uses the template version in force on that date', () => {
    const gym = gymWith({ splits: [{ from: '2026-09-01', days: week() }, { from: '2026-10-06', days: week(day('Legs')) }] })
    expect(dayPlan(gym, '2026-10-05')?.label).toBe('Chest+Tri')
    expect(dayPlan(gym, '2026-10-12')?.label).toBe('Legs')
    expect(templateFor(gym, '2026-10-12')[1]?.label).toBe('Legs')
  })
  it('lets a date override the template with rest or another day', () => {
    const gym = gymWith({ overrides: { '2026-10-05': null, '2026-10-07': day('Back+Bi', ['Row']) } })
    expect(dayPlan(gym, '2026-10-05')).toBeNull()
    expect(dayPlan(gym, '2026-10-07')?.label).toBe('Back+Bi')
    expect(dayPlan(gym, '2026-10-12')?.label).toBe('Chest+Tri')
  })
})

describe('weeklyConsistency', () => {
  it('counts planned days up to today and the ones ticked off', () => {
    const gym = gymWith({ done: { '2026-10-05': true } })
    expect(weeklyConsistency(gym, '2026-10-07', 2)).toEqual([
      { weekStart: '2026-09-28', planned: 2, done: 0 },
      { weekStart: '2026-10-05', planned: 2, done: 1 }
    ])
  })
  it('does not count future days or rest overrides', () => {
    const gym = gymWith({ overrides: { '2026-10-06': null } })
    expect(weeklyConsistency(gym, '2026-10-05', 1)).toEqual([{ weekStart: '2026-10-05', planned: 1, done: 0 }])
    expect(weeklyConsistency(gym, '2026-10-07', 1)).toEqual([{ weekStart: '2026-10-05', planned: 1, done: 0 }])
  })
  it('is all zeros for an empty gym', () => {
    expect(weeklyConsistency(emptyGym(), '2026-10-07', 2).every((w) => w.planned === 0 && w.done === 0)).toBe(true)
  })
})

describe('strength', () => {
  it('estimates a one rep max with the Epley formula', () => {
    expect(e1rm(100, 5)).toBe(116.7)
    expect(e1rm(100, 1)).toBe(100)
    expect(e1rm(60, 10)).toBe(80)
  })

  const sets = [
    { id: '1', date: '2026-10-05', exercise: 'Bench', weightKg: 100, reps: 5 },
    { id: '2', date: '2026-10-05', exercise: 'Bench', weightKg: 90, reps: 8 },
    { id: '3', date: '2026-10-12', exercise: 'Bench', weightKg: 105, reps: 3 },
    { id: '4', date: '2026-10-05', exercise: 'Squat', weightKg: 120, reps: 5 }
  ]

  it('keeps the best estimate per session and ignores other exercises', () => {
    expect(strengthSeries(gymWith({ sets }), 'Bench')).toEqual([
      { date: '2026-10-05', e1rm: 116.7 },
      { date: '2026-10-12', e1rm: 115.5 }
    ])
    expect(strengthSeries(gymWith(), 'Bench')).toEqual([])
  })
  it('divides by the latest weigh-in on or before each session and skips earlier ones', () => {
    const gym = gymWith({ sets, weighIns: { '2026-10-10': 80 } })
    expect(relativeStrength(gym, 'Bench')).toEqual([{ date: '2026-10-12', ratio: 1.44 }])
  })
  it('lists exercise names without case duplicates', () => {
    const gym = gymWith({ sets: [{ id: '1', date: '2026-10-05', exercise: 'bench', weightKg: 50, reps: 5 }, { id: '2', date: '2026-10-05', exercise: 'Squat', weightKg: 50, reps: 5 }] })
    expect(exerciseNames(gym)).toEqual(['Bench', 'Row', 'Squat'])
    expect(canonicalExercise(gym, 'ROW')).toBe('Row')
    expect(canonicalExercise(gym, 'Deadlift')).toBe('Deadlift')
  })
})

describe('weight', () => {
  const weighIns = { '2026-10-01': 80, '2026-10-03': 78, '2026-10-07': 76 }
  it('averages the weigh-ins in the 7 days ending at each key', () => {
    const { raw, trend } = weightTrend(weighIns, daysBack('2026-10-07', 7))
    expect(raw).toEqual([80, null, 78, null, null, null, 76])
    expect(trend).toEqual([80, 80, 79, 79, 79, 79, 78])
  })
  it('has no trend without weigh-ins', () => {
    expect(weightTrend({}, daysBack('2026-10-07', 3))).toEqual({ raw: [null, null, null], trend: [null, null, null] })
  })
  it('finds the latest weigh-in', () => {
    expect(latestWeight(weighIns)).toBe(76)
    expect(latestWeight({})).toBeNull()
  })
})

describe('validation', () => {
  const set = { date: '2026-10-05', exercise: 'Bench', weightKg: 80, reps: 5 }
  it('accepts a normal set', () => expect(validateSet(set, '2026-10-05')).toBeNull())
  it('rejects bad sets', () => {
    expect(validateSet({ ...set, exercise: '  ' }, '2026-10-05')).toMatch(/exercise/i)
    expect(validateSet({ ...set, weightKg: 0 }, '2026-10-05')).toMatch(/weight/i)
    expect(validateSet({ ...set, weightKg: 5000 }, '2026-10-05')).toMatch(/weight/i)
    expect(validateSet({ ...set, weightKg: NaN }, '2026-10-05')).toMatch(/weight/i)
    expect(validateSet({ ...set, reps: 2.5 }, '2026-10-05')).toMatch(/reps/i)
    expect(validateSet({ ...set, reps: 0 }, '2026-10-05')).toMatch(/reps/i)
    expect(validateSet({ ...set, date: '2026-10-06' }, '2026-10-05')).toMatch(/future/i)
    expect(validateSet({ ...set, date: '2026-02-30' }, '2026-10-05')).toMatch(/future|date/i)
  })
  it('validates weigh-ins', () => {
    expect(validateWeighIn(72.4)).toBeNull()
    expect(validateWeighIn(5)).toMatch(/weight/i)
    expect(validateWeighIn(NaN)).toMatch(/weight/i)
  })
  it('normalises then validates a split', () => {
    const days = normalizeDays([null, { label: '  Push ', exercises: [' Bench ', '', '  '] }, { label: '   ', exercises: ['x'] }, null, null, null, null])
    expect(days[1]).toEqual({ label: 'Push', exercises: ['Bench'] })
    expect(days[2]).toBeNull()
    expect(validateGymDays(days)).toBeNull()
  })
  it('rejects malformed splits', () => {
    expect(validateGymDays([null, null])).toMatch(/7 days/)
    expect(validateGymDays(week(day('x'.repeat(25))))).toMatch(/label/i)
    expect(validateGymDays(week(day('Push', Array.from({ length: 21 }, (_, i) => `e${i}`))))).toMatch(/exercises/i)
    expect(validateGymDays(week(day('Push', ['y'.repeat(61)])))).toMatch(/exercise/i)
  })
})
