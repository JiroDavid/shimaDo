import { addDays, weekStart } from './dates'

export function monthGrid(monthKey: string): string[][] {
  const start = weekStart(`${monthKey}-01`)
  return Array.from({ length: 6 }, (_, r) => Array.from({ length: 7 }, (_, c) => addDays(start, r * 7 + c)))
}

export function shiftMonth(monthKey: string, n: number): string {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
