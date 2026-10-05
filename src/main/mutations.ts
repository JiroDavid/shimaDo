import type { Accent, AppData, ProfileInput, SettingsPatch, Task, TaskInput } from '../shared/types'
import { validateProfile } from '../shared/profile'
import { validateTaskInput } from '../shared/validate'

function normalise(input: TaskInput): Omit<Task, 'id' | 'createdOn' | 'archivedOn'> {
  const error = validateTaskInput(input)
  if (error) throw new Error(error)
  const notes = input.notes?.trim()
  return {
    title: input.title.trim(),
    ...(notes ? { notes } : {}),
    kind: input.kind,
    ...(input.kind === 'once' ? { date: input.date } : {}),
    ...(input.kind === 'weekly' ? { weekdays: [...new Set(input.weekdays)].sort((a, b) => a - b) } : {}),
    time: input.time
  }
}

export function addTask(d: AppData, input: TaskInput, todayKey: string, id: string): Task {
  const task: Task = { id, createdOn: todayKey, ...normalise(input) }
  d.tasks.push(task)
  return task
}

export function updateTask(d: AppData, id: string, input: TaskInput): void {
  const idx = d.tasks.findIndex((t) => t.id === id)
  if (idx === -1) return
  const { id: keepId, createdOn, archivedOn } = d.tasks[idx]
  d.tasks[idx] = { id: keepId, createdOn, ...(archivedOn ? { archivedOn } : {}), ...normalise(input) }
}

export function deleteTask(d: AppData, id: string, todayKey: string): void {
  const task = d.tasks.find((t) => t.id === id)
  if (task) task.archivedOn = todayKey
}

export function setDone(d: AppData, taskId: string, date: string, done: boolean, nowIso: string): void {
  const exists = d.completions.some((c) => c.taskId === taskId && c.occurrenceDate === date)
  if (done && !exists) d.completions.push({ taskId, occurrenceDate: date, doneAt: nowIso })
  if (!done) d.completions = d.completions.filter((c) => !(c.taskId === taskId && c.occurrenceDate === date))
}

export function setNicotine(d: AppData, date: string, on: boolean): void {
  if (on) d.nicotine[date] = true
  else delete d.nicotine[date]
}

const ACCENTS: Accent[] = ['brick', 'sage', 'cream']

export function sanitizeSettingsPatch(raw: unknown): SettingsPatch {
  if (typeof raw !== 'object' || raw === null) return {}
  const r = raw as Record<string, unknown>
  const out: SettingsPatch = {}
  if (typeof r.opacity === 'number' && Number.isFinite(r.opacity)) out.opacity = Math.min(1, Math.max(0.3, r.opacity))
  if (ACCENTS.includes(r.accent as Accent)) out.accent = r.accent as Accent
  if (typeof r.alwaysOnTop === 'boolean') out.alwaysOnTop = r.alwaysOnTop
  if (typeof r.launchAtStartup === 'boolean') out.launchAtStartup = r.launchAtStartup
  return out
}

export function setProfile(d: AppData, input: ProfileInput, todayKey: string): void {
  const error = validateProfile(input, todayKey)
  if (error) throw new Error(error)
  d.profile = {
    username: input.username.trim(),
    firstName: input.firstName.trim(),
    dateOfBirth: input.dateOfBirth,
    heightCm: input.heightCm,
    avatarUpdatedAt: d.profile.avatarUpdatedAt
  }
}

export function setAvatarStamp(d: AppData, stamp: number): void {
  d.profile.avatarUpdatedAt = stamp
}
