import type { AppData, Occurrence, Task } from './types'
import { addDays, dueMs, toDateKey, weekdayOf } from './dates'

export type Schedule = Pick<AppData, 'tasks' | 'completions'>

export function occursOn(task: Task, key: string): boolean {
  if (task.archivedOn && key >= task.archivedOn) return false
  switch (task.kind) {
    case 'once':
      return task.date === key
    case 'daily':
      return key >= task.createdOn
    case 'weekly':
      return key >= task.createdOn && (task.weekdays ?? []).includes(weekdayOf(key))
  }
}

const sortKey = (t: Task) => t.time || '99:99'
const byTime = (a: Occurrence, b: Occurrence) =>
  sortKey(a.task).localeCompare(sortKey(b.task)) || a.task.title.localeCompare(b.task.title)

const isDone = (data: Schedule, taskId: string, key: string) =>
  data.completions.some((c) => c.taskId === taskId && c.occurrenceDate === key)

export function occurrencesOn(data: Schedule, key: string): Occurrence[] {
  return data.tasks
    .filter((t) => occursOn(t, key))
    .map((task) => ({ task, date: key, done: isDone(data, task.id, key) }))
    .sort(byTime)
}

export function overdueOnce(data: Schedule, todayKey: string): Occurrence[] {
  return data.tasks
    .filter((t) => t.kind === 'once' && t.date !== undefined && t.date < todayKey && !t.archivedOn)
    .map((task) => ({ task, date: task.date as string, done: isDone(data, task.id, task.date as string) }))
    .filter((o) => !o.done)
    .sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b))
}

export function dueBetween(data: Schedule, fromMs: number, toMs: number): Occurrence[] {
  const out: Occurrence[] = []
  const last = toDateKey(new Date(toMs))
  for (let key = toDateKey(new Date(fromMs)); key <= last; key = addDays(key, 1)) {
    for (const o of occurrencesOn(data, key)) {
      if (o.done || !o.task.time) continue
      const due = dueMs(key, o.task.time)
      if (due > fromMs && due <= toMs) out.push(o)
    }
  }
  return out
}
