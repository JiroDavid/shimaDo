import { describe, it, expect } from 'vitest'
import { doneCountByDay, consistency, taskStreak, habitStreak, habitWeeks } from './stats'
import type { Task, Completion } from './types'

const daily = (id: string): Task => ({ id, title: id, kind: 'daily', createdOn: '2026-10-01', time: '09:00' })
const done = (taskId: string, occurrenceDate: string): Completion => ({ taskId, occurrenceDate, doneAt: 'x' })
const TODAY = '2026-10-05'

describe('doneCountByDay and consistency', () => {
  const tasks = [daily('a'), daily('b')]
  const completions = [done('a', '2026-10-02'), done('a', '2026-10-03'), done('b', '2026-10-03')]
  const keys = ['2026-09-30', '2026-10-02', '2026-10-03']

  it('counts done occurrences per day', () => {
    expect(doneCountByDay({ tasks, completions }, keys)).toEqual([0, 1, 2])
  })
  it('returns null before tasks exist and a fraction after', () => {
    expect(consistency({ tasks, completions }, keys)).toEqual([null, 0.5, 1])
  })
})

describe('taskStreak', () => {
  const tasks = [daily('a')]
  it('counts consecutive complete days and ignores an unfinished today', () => {
    const completions = ['01', '02', '03', '04'].map((d) => done('a', `2026-10-${d}`))
    expect(taskStreak({ tasks, completions }, TODAY)).toBe(4)
  })
  it('includes today when finished', () => {
    const completions = ['01', '02', '03', '04', '05'].map((d) => done('a', `2026-10-${d}`))
    expect(taskStreak({ tasks, completions }, TODAY)).toBe(5)
  })
  it('stops at the first incomplete past day', () => {
    expect(taskStreak({ tasks, completions: [done('a', '2026-10-04'), done('a', '2026-10-05')] }, TODAY)).toBe(2)
  })
  it('is 0 with no tasks and terminates', () => {
    expect(taskStreak({ tasks: [], completions: [] }, TODAY)).toBe(0)
  })
})

describe('habit stats', () => {
  it('streak counts back from today, tolerating an unticked today', () => {
    expect(habitStreak({ '2026-10-03': true, '2026-10-04': true }, TODAY)).toBe(2)
    expect(habitStreak({ '2026-10-03': true, '2026-10-04': true, '2026-10-05': true }, TODAY)).toBe(3)
  })
  it('streak stops at a gap', () => {
    expect(habitStreak({ '2026-10-05': true, '2026-10-03': true }, TODAY)).toBe(1)
  })
  it('streak is 0 with no ticks', () => {
    expect(habitStreak({}, TODAY)).toBe(0)
  })
  it('weekly counts are oldest first and include empty weeks', () => {
    const nic = { '2026-09-28': true, '2026-09-29': true, '2026-10-05': true } as const
    expect(habitWeeks(nic, '2026-10-07', 3)).toEqual([
      { weekStart: '2026-09-21', count: 0 },
      { weekStart: '2026-09-28', count: 2 },
      { weekStart: '2026-10-05', count: 1 }
    ])
  })
})
