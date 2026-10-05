import { describe, it, expect } from 'vitest'
import {
  toDateKey, fromDateKey, addDays, weekdayOf, weekStart, weekDays,
  daysBack, dueMs, isValidTime, isValidDateKey, formatDay
} from './dates'

describe('dates', () => {
  it('round trips keys', () => {
    expect(toDateKey(fromDateKey('2026-02-03'))).toBe('2026-02-03')
  })

  it('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('addDays is stable across DST changes', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08')
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
  })

  it('weekdayOf uses 0 = Sunday', () => {
    expect(weekdayOf('2026-10-05')).toBe(1)
    expect(weekdayOf('2026-10-11')).toBe(0)
  })

  it('weekStart is the Monday of that week', () => {
    expect(weekStart('2026-10-05')).toBe('2026-10-05')
    expect(weekStart('2026-10-07')).toBe('2026-10-05')
    expect(weekStart('2026-10-11')).toBe('2026-10-05')
  })

  it('weekDays returns Monday to Sunday', () => {
    const days = weekDays('2026-10-07')
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-10-05')
    expect(days[6]).toBe('2026-10-11')
  })

  it('daysBack is oldest first and inclusive', () => {
    expect(daysBack('2026-10-05', 3)).toEqual(['2026-10-03', '2026-10-04', '2026-10-05'])
  })

  it('dueMs builds a local timestamp', () => {
    const d = new Date(dueMs('2026-10-05', '21:30'))
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 9, 5, 21, 30])
  })

  it('validates times and date keys', () => {
    expect(isValidTime('09:00')).toBe(true)
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('9:00')).toBe(false)
    expect(isValidDateKey('2026-02-28')).toBe(true)
    expect(isValidDateKey('2026-02-30')).toBe(false)
    expect(isValidDateKey('nope')).toBe(false)
  })

  it('formatDay is uppercase weekday day month year', () => {
    expect(formatDay('2026-10-05')).toBe('MON 05 OCT 2026')
  })
})
