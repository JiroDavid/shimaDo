import { describe, it, expect } from 'vitest'
import { monthGrid, shiftMonth } from './calendar'

describe('monthGrid', () => {
  it('is six Monday-first weeks that include the leading and trailing days', () => {
    const grid = monthGrid('2026-10')
    expect(grid).toHaveLength(6)
    expect(grid.every((row) => row.length === 7)).toBe(true)
    expect(grid[0][0]).toBe('2026-09-28')
    expect(grid[5][6]).toBe('2026-11-08')
  })
  it('contains every day of the month exactly once and in order', () => {
    const inMonth = monthGrid('2026-10').flat().filter((k) => k.startsWith('2026-10-'))
    expect(inMonth).toEqual(Array.from({ length: 31 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`))
  })
  it('starts on the Monday on or before the 1st', () => {
    expect(monthGrid('2026-02')[0][0]).toBe('2026-01-26')
    expect(monthGrid('2026-06')[0][0]).toBe('2026-06-01')
  })
})

describe('shiftMonth', () => {
  it('moves across year boundaries in both directions', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-10', 0)).toBe('2026-10')
  })
})
