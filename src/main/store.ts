import fs from 'node:fs'
import path from 'node:path'
import { PANEL_IDS, type AppData, type Gym, type Habit, type PanelId, type PanelState, type Profile, type Settings, type Task } from '../shared/types'
import { emptyGym } from '../shared/gym'
import { isValidTime } from '../shared/dates'
import { MAX_NOTES_LENGTH } from '../shared/notes'
import { sanitizeAssets } from '../shared/assets'
import { emptyDesign, sanitizeDesign } from '../shared/design'
import { normaliseAccentInput } from '../shared/theme'
import { DEFAULT_THEME_ID, themeById } from '../shared/themes'
import { isHabitIcon, MAX_HABITS, MAX_HABIT_NAME } from '../shared/habits'
import { emptyProfile } from '../shared/profile'
import { clampZoom } from '../shared/zoom'

export const LAYOUT_VERSION = 3
const RESIZED_BY_SCALING: PanelId[] = ['checklist', 'schedule', 'gym', 'progress', 'habits', 'focus', 'notepad', 'settings', 'profile']

export function defaultData(): AppData {
  return {
    version: 1,
    tasks: [],
    completions: [],
    habits: [],
    habitLog: {},
    notes: '',
    design: emptyDesign(),
    assets: {},
    pomodoros: {},
    pomodoroLog: [],
    profile: emptyProfile(),
    gym: emptyGym(),
    settings: {
      opacity: 0.9,
      alwaysOnTop: true,
      accent: 'orange',
      theme: DEFAULT_THEME_ID,
      onboarded: false,
      launchAtStartup: true,
      textScale: 1,
      layoutVersion: LAYOUT_VERSION,
      panels: {
        bar: { width: 600, height: 50, visible: true },
        checklist: { width: 300, height: 440, visible: true },
        schedule: { width: 350, height: 470, visible: false },
        gym: { width: 350, height: 470, visible: false },
        progress: { width: 300, height: 480, visible: true },
        habits: { width: 300, height: 530, visible: true },
        focus: { width: 280, height: 475, visible: false },
        notepad: { width: 300, height: 340, visible: false },
        welcome: { width: 520, height: 600, visible: false },
        designer: { width: 320, height: 640, visible: false },
        layers: { width: 300, height: 760, visible: false },
        settings: { width: 330, height: 450, visible: false },
        profile: { width: 315, height: 610, visible: false },
        confirm: { width: 320, height: 190, visible: false },
        mini: { width: 64, height: 64, visible: false }
      }
    }
  }
}

function pickGym(raw: unknown): Gym {
  const base = emptyGym()
  if (typeof raw !== 'object' || raw === null) return base
  const g = raw as Partial<Gym>
  return {
    splits: Array.isArray(g.splits) ? g.splits : base.splits,
    overrides: typeof g.overrides === 'object' && g.overrides !== null ? g.overrides : base.overrides,
    done: typeof g.done === 'object' && g.done !== null ? g.done : base.done,
    weighIns: typeof g.weighIns === 'object' && g.weighIns !== null ? g.weighIns : base.weighIns
  }
}

function cleanTask(t: Task): Task {
  if (t.endTime === undefined) return t
  const { endTime, ...rest } = t
  return isValidTime(endTime) && typeof t.time === 'string' && t.time !== '' && endTime > t.time ? t : rest
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function pickHabits(r: Record<string, unknown>): Pick<AppData, 'habits' | 'habitLog'> {
  if (!Array.isArray(r.habits)) {
    if (!isRecord(r.nicotine)) return { habits: [], habitLog: {} }
    return {
      habits: [{ id: 'nicotine', name: 'No nicotine', icon: 'ban' }],
      habitLog: { nicotine: r.nicotine as Record<string, true> }
    }
  }
  const habits: Habit[] = []
  for (const h of r.habits) {
    if (!isRecord(h) || typeof h.id !== 'string' || typeof h.name !== 'string' || !h.name.trim()) continue
    if (habits.some((x) => x.id === h.id)) continue
    habits.push({ id: h.id, name: h.name.trim().slice(0, MAX_HABIT_NAME), icon: isHabitIcon(h.icon) ? h.icon : 'check' })
  }
  const log = isRecord(r.habitLog) ? r.habitLog : {}
  const habitLog: AppData['habitLog'] = {}
  for (const h of habits) if (isRecord(log[h.id])) habitLog[h.id] = log[h.id] as Record<string, true>
  return { habits: habits.slice(0, MAX_HABITS), habitLog }
}

export function migrate(raw: unknown): AppData {
  if (typeof raw !== 'object' || raw === null) throw new Error('invalid data file')
  const r = raw as Record<string, unknown>
  if (r.version !== 1) throw new Error(`unsupported data version ${String(r.version)}`)
  const def = defaultData()
  const assets = sanitizeAssets(r.assets)
  const s = (typeof r.settings === 'object' && r.settings !== null ? r.settings : {}) as Partial<Settings>
  const theme = themeById(typeof s.theme === 'string' ? s.theme : DEFAULT_THEME_ID)
  const panels = {} as Record<PanelId, PanelState>
  const saved = (s.panels ?? {}) as Partial<Record<string, PanelState>>
  for (const id of PANEL_IDS) panels[id] = { ...def.settings.panels[id], ...((id === 'habits' ? saved.habits ?? saved.nicotine : saved[id]) ?? {}) }
  if (s.layoutVersion !== LAYOUT_VERSION) {
    for (const id of RESIZED_BY_SCALING) {
      panels[id].width = def.settings.panels[id].width
      panels[id].height = def.settings.panels[id].height
    }
  }
  for (const id of PANEL_IDS) {
    if (panels[id].zoom === undefined) continue
    const z = clampZoom(panels[id].zoom)
    if (z === 1) delete panels[id].zoom
    else panels[id].zoom = z
  }
  return {
    version: 1,
    tasks: Array.isArray(r.tasks) ? (r.tasks as AppData['tasks']).map(cleanTask) : [],
    completions: Array.isArray(r.completions) ? (r.completions as AppData['completions']) : [],
    ...pickHabits(r),
    notes: typeof r.notes === 'string' ? r.notes.slice(0, MAX_NOTES_LENGTH) : '',
    design: sanitizeDesign(r.design, assets),
    assets,
    pomodoros: typeof r.pomodoros === 'object' && r.pomodoros !== null ? (r.pomodoros as AppData['pomodoros']) : {},
    pomodoroLog: Array.isArray(r.pomodoroLog) ? (r.pomodoroLog as AppData['pomodoroLog']) : [],
    profile: { ...emptyProfile(), ...(typeof r.profile === 'object' && r.profile !== null ? (r.profile as Partial<Profile>) : {}) },
    gym: pickGym(r.gym),
    settings: {
      ...def.settings,
      ...s,
      panels,
      layoutVersion: LAYOUT_VERSION,
      theme: theme.id,
      accent: normaliseAccentInput(s.accent) ?? theme.defaultAccent,
      onboarded: typeof s.onboarded === 'boolean' ? s.onboarded : true
    }
  }
}

export function hideTransientPanels(d: AppData): void {
  const p = d.settings.panels
  p.settings.visible = false
  p.profile.visible = false
  p.confirm.visible = false
  p.welcome.visible = false
  p.designer.visible = false
  p.layers.visible = false
  p.mini.visible = false
}

export class Store {
  data: AppData = defaultData()

  constructor(private file: string) {}

  load(): void {
    if (!fs.existsSync(this.file)) {
      this.data = defaultData()
      return
    }
    try {
      this.data = migrate(JSON.parse(fs.readFileSync(this.file, 'utf8')))
      hideTransientPanels(this.data)
    } catch {
      fs.renameSync(this.file, `${this.file}.corrupt-${Date.now()}`)
      this.data = defaultData()
    }
  }

  save(): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true })
    const tmp = `${this.file}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2))
    fs.renameSync(tmp, this.file)
  }

  update<T>(fn: (d: AppData) => T): T {
    const result = fn(this.data)
    this.save()
    return result
  }
}
