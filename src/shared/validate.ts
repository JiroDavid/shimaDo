import { isValidDateKey, isValidTime } from './dates'
import { TASK_TAGS, type TaskInput } from './types'

export function validateTaskInput(i: TaskInput): string | null {
  const title = i.title.trim()
  if (!title) return 'Title is required'
  if (title.length > 200) return 'Title is too long'
  if (i.time !== '' && !isValidTime(i.time)) return 'Time must be HH:MM'
  if (i.endTime !== undefined && i.endTime !== '') {
    if (i.time === '') return 'Set a start time before an end time'
    if (!isValidTime(i.endTime)) return 'End time must be HH:MM'
    if (i.endTime <= i.time) return 'End time must be after the start time'
  }
  if (i.tag !== undefined && !TASK_TAGS.includes(i.tag)) return 'Unknown tag'
  if (i.kind === 'once' && !(i.date && isValidDateKey(i.date))) return 'Pick a valid date'
  if (i.kind === 'weekly') {
    const days = i.weekdays ?? []
    if (days.length === 0 || !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) return 'Pick at least one weekday'
  }
  return null
}
