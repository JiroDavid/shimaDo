const pad = (n: number) => String(n).padStart(2, '0')
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

export function weekdayOf(key: string): number {
  return fromDateKey(key).getDay()
}

export function weekStart(key: string): string {
  return addDays(key, -((weekdayOf(key) + 6) % 7))
}

export function weekDays(key: string): string[] {
  const start = weekStart(key)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function daysBack(endKey: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(endKey, i - (n - 1)))
}

export function dueMs(key: string, time: string): number {
  const [h, m] = time.split(':').map(Number)
  const d = fromDateKey(key)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t)
}

export function isValidDateKey(k: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(k) && toDateKey(fromDateKey(k)) === k
}

export function formatDay(key: string): string {
  const d = fromDateKey(key)
  return `${WEEKDAYS[d.getDay()]} ${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
