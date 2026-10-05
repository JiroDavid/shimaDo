import { describe, it, expect } from 'vitest'
import { dayPlan } from '../shared/gym'
import type { GymDay } from '../shared/types'
import { addGymSet, deleteGymSet, setGymDone, setGymOverride, setSplit, setWeighIn } from './mutations'
import { defaultData } from './store'

const week = (label: string): (GymDay | null)[] => Array.from({ length: 7 }, (_, i) => (i === 1 ? { label, exercises: ['Bench'] } : null))
const TODAY = '2026-10-05'

describe('setSplit', () => {
  it('normalises and starts a new version today', () => {
    const d = defaultData()
    setSplit(d, week(' Chest+Tri '), TODAY)
    expect(d.gym.splits).toEqual([{ from: TODAY, days: week('Chest+Tri') }])
  })
  it('replaces the version that already starts today', () => {
    const d = defaultData()
    setSplit(d, week('A'), TODAY)
    setSplit(d, week('B'), TODAY)
    expect(d.gym.splits).toHaveLength(1)
    expect(d.gym.splits[0].days[1]?.label).toBe('B')
  })
  it('keeps earlier versions for earlier dates', () => {
    const d = defaultData()
    setSplit(d, week('Chest+Tri'), TODAY)
    setSplit(d, week('Legs'), '2026-10-12')
    expect(dayPlan(d.gym, '2026-10-05')?.label).toBe('Chest+Tri')
    expect(dayPlan(d.gym, '2026-10-12')?.label).toBe('Legs')
  })
  it('rejects malformed splits without changing data', () => {
    const d = defaultData()
    expect(() => setSplit(d, [null, null], TODAY)).toThrow(/7 days/)
    expect(() => setSplit(d, week('x'.repeat(25)), TODAY)).toThrow(/label/i)
    expect(d.gym.splits).toEqual([])
  })
})

describe('overrides and done', () => {
  it('sets rest, sets another day, and reverts', () => {
    const d = defaultData()
    setSplit(d, week('Chest+Tri'), '2026-09-01')
    setGymOverride(d, TODAY, null)
    expect(dayPlan(d.gym, TODAY)).toBeNull()
    setGymOverride(d, TODAY, { label: ' Back+Bi ', exercises: ['Row'] })
    expect(dayPlan(d.gym, TODAY)?.label).toBe('Back+Bi')
    setGymOverride(d, TODAY, undefined)
    expect(dayPlan(d.gym, TODAY)?.label).toBe('Chest+Tri')
  })
  it('rejects a bad date or day', () => {
    const d = defaultData()
    expect(() => setGymOverride(d, 'nope', null)).toThrow(/date/i)
    expect(() => setGymOverride(d, TODAY, { label: '', exercises: [] })).toThrow(/label/i)
    expect(() => setGymDone(d, '2026-02-30', true)).toThrow(/date/i)
  })
  it('toggles done', () => {
    const d = defaultData()
    setGymDone(d, TODAY, true)
    expect(d.gym.done[TODAY]).toBe(true)
    setGymDone(d, TODAY, false)
    expect(d.gym.done).toEqual({})
  })
})

describe('sets and weigh-ins', () => {
  it('addGymSet validates, reuses an existing spelling and marks the day done', () => {
    const d = defaultData()
    addGymSet(d, { date: TODAY, exercise: ' Bench Press ', weightKg: 80, reps: 5 }, 's1', TODAY)
    const second = addGymSet(d, { date: TODAY, exercise: 'bench press', weightKg: 82.5, reps: 5 }, 's2', TODAY)
    expect(second.exercise).toBe('Bench Press')
    expect(d.gym.done[TODAY]).toBe(true)
    expect(d.gym.sets).toHaveLength(2)
  })
  it('addGymSet rejects bad sets without changing data', () => {
    const d = defaultData()
    const base = { date: TODAY, exercise: 'Bench', weightKg: 80, reps: 5 }
    expect(() => addGymSet(d, { ...base, weightKg: 0 }, 'x', TODAY)).toThrow(/weight/i)
    expect(() => addGymSet(d, { ...base, date: '2026-10-06' }, 'x', TODAY)).toThrow(/future/i)
    expect(() => addGymSet(d, { ...base, reps: 2.5 }, 'x', TODAY)).toThrow(/reps/i)
    expect(d.gym.sets).toEqual([])
    expect(d.gym.done).toEqual({})
  })
  it('deleteGymSet removes by id', () => {
    const d = defaultData()
    addGymSet(d, { date: TODAY, exercise: 'Bench', weightKg: 80, reps: 5 }, 's1', TODAY)
    deleteGymSet(d, 's1')
    expect(d.gym.sets).toEqual([])
  })
  it('setWeighIn sets, overwrites, removes and validates', () => {
    const d = defaultData()
    setWeighIn(d, TODAY, 72.4)
    setWeighIn(d, TODAY, 72.1)
    expect(d.gym.weighIns).toEqual({ [TODAY]: 72.1 })
    setWeighIn(d, TODAY, null)
    expect(d.gym.weighIns).toEqual({})
    expect(() => setWeighIn(d, TODAY, 5)).toThrow(/weight/i)
    expect(() => setWeighIn(d, 'nope', 70)).toThrow(/date/i)
  })
})
