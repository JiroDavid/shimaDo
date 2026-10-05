import { describe, it, expect } from 'vitest'
import { occursOn, occurrencesOn, overdueOnce, dueBetween } from './recurrence'
import { dueMs } from './dates'
import type { Task, Completion } from './types'

const t = (o: Partial<Task>): Task => ({ id: 't1', title: 'x', kind: 'daily', createdOn: '2026-10-01', time: '09:00', ...o })
const done = (taskId: string, occurrenceDate: string): Completion => ({ taskId, occurrenceDate, doneAt: 'x' })

describe('occursOn', () => {
  it('daily starts on the creation day', () => {
    expect(occursOn(t({}), '2026-09-30')).toBe(false)
    expect(occursOn(t({}), '2026-10-01')).toBe(true)
  })
  it('weekly follows listed weekdays', () => {
    const w = t({ kind: 'weekly', weekdays: [1] })
    expect(occursOn(w, '2026-10-05')).toBe(true)
    expect(occursOn(w, '2026-10-06')).toBe(false)
  })
  it('weekly with no weekdays never occurs', () => {
    expect(occursOn(t({ kind: 'weekly', weekdays: [] }), '2026-10-05')).toBe(false)
  })
  it('once occurs only on its date, even before createdOn', () => {
    const o = t({ kind: 'once', date: '2026-09-20' })
    expect(occursOn(o, '2026-09-20')).toBe(true)
    expect(occursOn(o, '2026-09-21')).toBe(false)
  })
  it('archived tasks stop on archivedOn but keep earlier history', () => {
    const a = t({ archivedOn: '2026-10-05' })
    expect(occursOn(a, '2026-10-04')).toBe(true)
    expect(occursOn(a, '2026-10-05')).toBe(false)
  })
})

describe('occurrencesOn', () => {
  it('marks done and sorts by time with untimed last', () => {
    const tasks = [t({ id: 'c', title: 'c', time: '' }), t({ id: 'b', title: 'b', time: '10:00' }), t({ id: 'a', title: 'a', time: '08:00' })]
    const occ = occurrencesOn({ tasks, completions: [done('b', '2026-10-05')] }, '2026-10-05')
    expect(occ.map((o) => o.task.id)).toEqual(['a', 'b', 'c'])
    expect(occ.map((o) => o.done)).toEqual([false, true, false])
  })
})

describe('overdueOnce', () => {
  it('carries undone past one-off tasks, skipping done and archived', () => {
    const tasks = [
      t({ id: 'missed', kind: 'once', date: '2026-10-04' }),
      t({ id: 'finished', kind: 'once', date: '2026-10-03' }),
      t({ id: 'gone', kind: 'once', date: '2026-10-02', archivedOn: '2026-10-03' }),
      t({ id: 'today', kind: 'once', date: '2026-10-05' }),
      t({ id: 'daily' })
    ]
    const out = overdueOnce({ tasks, completions: [done('finished', '2026-10-03')] }, '2026-10-05')
    expect(out.map((o) => o.task.id)).toEqual(['missed'])
    expect(out[0].date).toBe('2026-10-04')
  })
})

describe('dueBetween', () => {
  const day = '2026-10-05'
  const tasks = [t({ id: 'a', time: '09:00' })]

  it('includes occurrences due in (from, to]', () => {
    const out = dueBetween({ tasks, completions: [] }, dueMs(day, '08:59'), dueMs(day, '09:00'))
    expect(out.map((o) => o.task.id)).toEqual(['a'])
  })
  it('excludes the lower bound', () => {
    expect(dueBetween({ tasks, completions: [] }, dueMs(day, '09:00'), dueMs(day, '09:01'))).toEqual([])
  })
  it('skips completed and untimed tasks', () => {
    expect(dueBetween({ tasks, completions: [done('a', day)] }, dueMs(day, '08:59'), dueMs(day, '09:00'))).toEqual([])
    expect(dueBetween({ tasks: [t({ time: '' })], completions: [] }, dueMs(day, '00:00'), dueMs(day, '23:59'))).toEqual([])
  })
  it('handles a range that crosses midnight', () => {
    const midnight = [t({ id: 'm', time: '00:00' })]
    const out = dueBetween({ tasks: midnight, completions: [] }, dueMs(day, '23:59'), dueMs('2026-10-06', '00:01'))
    expect(out.map((o) => o.date)).toEqual(['2026-10-06'])
  })
})
