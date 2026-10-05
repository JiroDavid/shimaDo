import type { Accent, AppData, GymDay, GymSet, GymSetInput, ProfileInput, SettingsPatch, Task, TaskInput } from '../shared/types'
import { isValidDateKey } from '../shared/dates'
import { canonicalExercise, normalizeDay, normalizeDays, validateGymDay, validateGymDays, validateSet, validateWeighIn } from '../shared/gym'
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

export function updateTask(d: AppData, id: string, input: TaskInput, todayKey: string, newId: string): void {
  const idx = d.tasks.findIndex((t) => t.id === id)
  if (idx === -1) return
  const old = d.tasks[idx]
  const fields = normalise(input)
  const weekdaysChanged = fields.kind === 'weekly' && JSON.stringify(old.weekdays ?? []) !== JSON.stringify(fields.weekdays ?? [])
  const scheduleChanged = old.kind !== fields.kind || weekdaysChanged
  if (old.kind !== 'once' && scheduleChanged && old.createdOn < todayKey) {
    old.archivedOn = todayKey
    d.tasks.push({ id: newId, createdOn: todayKey, ...fields })
    return
  }
  const createdOn = old.kind === 'once' && fields.kind !== 'once' ? todayKey : old.createdOn
  d.tasks[idx] = { id: old.id, createdOn, ...(old.archivedOn ? { archivedOn: old.archivedOn } : {}), ...fields }
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

function assertDate(date: string): void {
  if (!isValidDateKey(date)) throw new Error('Invalid date')
}

export function setSplit(d: AppData, days: (GymDay | null)[], todayKey: string): void {
  const clean = normalizeDays(days)
  const error = validateGymDays(clean)
  if (error) throw new Error(error)
  const existing = d.gym.splits.find((s) => s.from === todayKey)
  if (existing) existing.days = clean
  else d.gym.splits.push({ from: todayKey, days: clean })
  d.gym.splits.sort((a, b) => a.from.localeCompare(b.from))
}

export function setGymOverride(d: AppData, date: string, value: GymDay | null | undefined): void {
  assertDate(date)
  if (value === undefined) {
    delete d.gym.overrides[date]
    return
  }
  if (value === null) {
    d.gym.overrides[date] = null
    return
  }
  const clean = normalizeDay(value)
  const error = validateGymDay(clean)
  if (error) throw new Error(error)
  d.gym.overrides[date] = clean
}

export function setGymDone(d: AppData, date: string, done: boolean): void {
  assertDate(date)
  if (done) d.gym.done[date] = true
  else delete d.gym.done[date]
}

export function addGymSet(d: AppData, input: GymSetInput, id: string, todayKey: string): GymSet {
  const error = validateSet(input, todayKey)
  if (error) throw new Error(error)
  const set: GymSet = { id, date: input.date, exercise: canonicalExercise(d.gym, input.exercise.trim()), weightKg: input.weightKg, reps: input.reps }
  d.gym.sets.push(set)
  d.gym.done[input.date] = true
  return set
}

export function deleteGymSet(d: AppData, id: string): void {
  d.gym.sets = d.gym.sets.filter((s) => s.id !== id)
}

export function setWeighIn(d: AppData, date: string, kg: number | null): void {
  assertDate(date)
  if (kg === null) {
    delete d.gym.weighIns[date]
    return
  }
  const error = validateWeighIn(kg)
  if (error) throw new Error(error)
  d.gym.weighIns[date] = kg
}
