import { describe, it, expect } from 'vitest'
import { validateTaskInput } from './validate'
import type { TaskInput } from './types'

const ok: TaskInput = { title: 'Gym', kind: 'daily', time: '07:00' }

describe('validateTaskInput', () => {
  it('accepts a valid daily task', () => expect(validateTaskInput(ok)).toBeNull())
  it('accepts an untimed task', () => expect(validateTaskInput({ ...ok, time: '' })).toBeNull())
  it('rejects blank titles', () => expect(validateTaskInput({ ...ok, title: '   ' })).toMatch(/title/i))
  it('rejects overlong titles', () => expect(validateTaskInput({ ...ok, title: 'a'.repeat(201) })).toMatch(/long/i))
  it('rejects malformed times', () => expect(validateTaskInput({ ...ok, time: '25:00' })).toMatch(/time/i))
  it('accepts an optional end time after the start', () => {
    expect(validateTaskInput({ ...ok, endTime: '08:30' })).toBeNull()
    expect(validateTaskInput({ ...ok, endTime: '' })).toBeNull()
  })
  it('rejects end times that are malformed, not after the start, or have no start', () => {
    expect(validateTaskInput({ ...ok, endTime: '8:30' })).toMatch(/end time/i)
    expect(validateTaskInput({ ...ok, endTime: '07:00' })).toMatch(/after/i)
    expect(validateTaskInput({ ...ok, endTime: '06:00' })).toMatch(/after/i)
    expect(validateTaskInput({ ...ok, time: '', endTime: '08:00' })).toMatch(/start time/i)
  })
  it('requires a real date for once tasks', () => {
    expect(validateTaskInput({ ...ok, kind: 'once' })).toMatch(/date/i)
    expect(validateTaskInput({ ...ok, kind: 'once', date: '2026-02-30' })).toMatch(/date/i)
    expect(validateTaskInput({ ...ok, kind: 'once', date: '2026-02-28' })).toBeNull()
  })
  it('requires at least one valid weekday for weekly tasks', () => {
    expect(validateTaskInput({ ...ok, kind: 'weekly', weekdays: [] })).toMatch(/weekday/i)
    expect(validateTaskInput({ ...ok, kind: 'weekly' })).toMatch(/weekday/i)
    expect(validateTaskInput({ ...ok, kind: 'weekly', weekdays: [7] })).toMatch(/weekday/i)
    expect(validateTaskInput({ ...ok, kind: 'weekly', weekdays: [1] })).toBeNull()
  })
  it('accepts the three fixed tags and rejects anything else', () => {
    for (const tag of ['urgent', 'must', 'important'] as const) expect(validateTaskInput({ ...ok, tag })).toBeNull()
    expect(validateTaskInput({ ...ok, tag: 'nope' as never })).toMatch(/tag/i)
  })
})
