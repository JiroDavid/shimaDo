import { isValidDateKey, isValidTime } from './dates'
import type { TaskInput } from './types'

export function validateTaskInput(i: TaskInput): string | null {
  const title = i.title.trim()
  if (!title) return 'Title is required'
  if (title.length > 200) return 'Title is too long'
  if (i.time !== '' && !isValidTime(i.time)) return 'Time must be HH:MM'
  if (i.kind === 'once' && !(i.date && isValidDateKey(i.date))) return 'Pick a valid date'
  if (i.kind === 'weekly') {
    const days = i.weekdays ?? []
    if (days.length === 0 || !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) return 'Pick at least one weekday'
  }
  return null
}
