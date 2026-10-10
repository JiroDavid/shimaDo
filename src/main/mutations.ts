import type { AppData, GymDay, Habit, HabitInput, ProfileInput, SettingsPatch, Task, TaskInput } from '../shared/types'
import { isValidDateKey } from '../shared/dates'
import { normalizeDay, normalizeDays, validateGymDay, validateGymDays, validateWeighIn } from '../shared/gym'
import { MAX_HABITS, validateHabitInput } from '../shared/habits'
import { CLIENT_ID_PATTERN, SPOTIFY_STYLES, type SpotifyStyle } from '../shared/spotify'
import { MAX_NOTES_LENGTH, MAX_PAGES, MAX_TITLE_LENGTH, defaultPage } from '../shared/notes'
import { normaliseAccentInput } from '../shared/theme'
import { THEME_IDS } from '../shared/themes'
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
    time: input.time,
    ...(input.endTime ? { endTime: input.endTime } : {}),
    ...(input.tag ? { tag: input.tag } : {})
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

export function addHabit(d: AppData, input: HabitInput, id: string): Habit {
  const error = validateHabitInput(input)
  if (error) throw new Error(error)
  if (d.habits.length >= MAX_HABITS) throw new Error(`You can track up to ${MAX_HABITS} habits`)
  const habit: Habit = { id, name: input.name.trim(), icon: input.icon }
  d.habits.push(habit)
  return habit
}

export function updateHabit(d: AppData, id: string, input: HabitInput): void {
  const error = validateHabitInput(input)
  if (error) throw new Error(error)
  const habit = d.habits.find((h) => h.id === id)
  if (!habit) return
  habit.name = input.name.trim()
  habit.icon = input.icon
}

export function deleteHabit(d: AppData, id: string): void {
  d.habits = d.habits.filter((h) => h.id !== id)
  delete d.habitLog[id]
}

export function setHabitDay(d: AppData, id: string, date: string, on: boolean): void {
  if (!isValidDateKey(date) || !d.habits.some((h) => h.id === id)) return
  if (on) (d.habitLog[id] ??= {})[date] = true
  else if (d.habitLog[id]) delete d.habitLog[id][date]
}

export function addPage(d: AppData, id: string): void {
  if (d.pages.length >= MAX_PAGES) return
  const used = new Set(d.pages.map((p) => p.title))
  let n = 1
  while (used.has(`Page ${n}`)) n++
  d.pages.push(defaultPage(id, n))
  d.activePage = id
}

export function deletePage(d: AppData, id: string, freshId: string): void {
  const i = d.pages.findIndex((p) => p.id === id)
  if (i < 0) return
  d.pages.splice(i, 1)
  if (d.pages.length === 0) d.pages.push(defaultPage(freshId))
  if (d.activePage === id) d.activePage = (d.pages[i - 1] ?? d.pages[i]).id
}

export function renamePage(d: AppData, id: string, title: string): void {
  const page = d.pages.find((p) => p.id === id)
  const next = typeof title === 'string' ? title.trim().slice(0, MAX_TITLE_LENGTH) : ''
  if (page && next) page.title = next
}

export function setPageText(d: AppData, id: string, text: string): void {
  const page = d.pages.find((p) => p.id === id)
  if (page && typeof text === 'string') page.text = text.slice(0, MAX_NOTES_LENGTH)
}

export function setActivePage(d: AppData, id: string): void {
  if (d.pages.some((p) => p.id === id)) d.activePage = id
}

export function claimWelcome(d: AppData): boolean {
  if (d.settings.onboarded) return false
  d.settings.onboarded = true
  return true
}

export function addPomodoro(d: AppData, date: string, task = '', endedAt = Date.now()): void {
  d.pomodoros[date] = (d.pomodoros[date] ?? 0) + 1
  d.pomodoroLog.push({ date, endedAt, task })
}

export function sanitizeSettingsPatch(raw: unknown): SettingsPatch {
  if (typeof raw !== 'object' || raw === null) return {}
  const r = raw as Record<string, unknown>
  const out: SettingsPatch = {}
  if (typeof r.opacity === 'number' && Number.isFinite(r.opacity)) out.opacity = Math.min(1, Math.max(0.3, r.opacity))
  const accent = normaliseAccentInput(r.accent)
  if (accent) out.accent = accent
  if (typeof r.theme === 'string' && THEME_IDS.includes(r.theme)) out.theme = r.theme
  if (typeof r.alwaysOnTop === 'boolean') out.alwaysOnTop = r.alwaysOnTop
  if (typeof r.launchAtStartup === 'boolean') out.launchAtStartup = r.launchAtStartup
  if (typeof r.textScale === 'number' && Number.isFinite(r.textScale)) out.textScale = Math.min(1.4, Math.max(0.8, r.textScale))
  if (typeof r.spotifyClientId === 'string') {
    const id = r.spotifyClientId.trim()
    if (id === '' || CLIENT_ID_PATTERN.test(id)) out.spotifyClientId = id
  }
  if (typeof r.spotifyStyle === 'string' && (SPOTIFY_STYLES as string[]).includes(r.spotifyStyle)) out.spotifyStyle = r.spotifyStyle as SpotifyStyle
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
