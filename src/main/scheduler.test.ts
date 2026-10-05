import { describe, it, expect } from 'vitest'
import { due, MAX_GAP_MS } from './scheduler'
import { dueMs } from '../shared/dates'
import type { Task } from '../shared/types'

const task: Task = { id: 'a', title: 'x', kind: 'daily', createdOn: '2026-10-01', time: '09:00' }
const data = { tasks: [task], completions: [] }
const day = '2026-10-05'

describe('due', () => {
  it('returns occurrences that became due since the last tick', () => {
    expect(due(data, dueMs(day, '08:59'), dueMs(day, '09:00')).map((o) => o.task.id)).toEqual(['a'])
  })
  it('does not fire twice for the same window boundary', () => {
    expect(due(data, dueMs(day, '09:00'), dueMs(day, '09:01'))).toEqual([])
  })
  it('skips reminders after a long gap such as sleep or a clock jump', () => {
    const from = dueMs(day, '08:00')
    expect(due(data, from, from + MAX_GAP_MS + 1)).toEqual([])
    expect(due(data, dueMs(day, '08:00'), dueMs(day, '12:00'))).toEqual([])
  })
})
