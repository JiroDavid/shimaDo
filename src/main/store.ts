import fs from 'node:fs'
import path from 'node:path'
import { PANEL_IDS, type AppData, type Gym, type PanelId, type PanelState, type Profile, type Settings } from '../shared/types'
import { emptyGym } from '../shared/gym'
import { emptyProfile } from '../shared/profile'

export function defaultData(): AppData {
  return {
    version: 1,
    tasks: [],
    completions: [],
    nicotine: {},
    profile: emptyProfile(),
    gym: emptyGym(),
    settings: {
      opacity: 0.9,
      alwaysOnTop: true,
      accent: 'brick',
      launchAtStartup: true,
      panels: {
        bar: { width: 480, height: 44, visible: true },
        checklist: { width: 340, height: 480, visible: true },
        schedule: { width: 380, height: 520, visible: false },
        gym: { width: 400, height: 560, visible: false },
        progress: { width: 340, height: 450, visible: true },
        nicotine: { width: 340, height: 380, visible: true },
        settings: { width: 340, height: 360, visible: false },
        profile: { width: 340, height: 440, visible: false }
      }
    }
  }
}

export function migrate(raw: unknown): AppData {
  if (typeof raw !== 'object' || raw === null) throw new Error('invalid data file')
  const r = raw as Record<string, unknown>
  if (r.version !== 1) throw new Error(`unsupported data version ${String(r.version)}`)
  const def = defaultData()
  const s = (typeof r.settings === 'object' && r.settings !== null ? r.settings : {}) as Partial<Settings>
  const panels = {} as Record<PanelId, PanelState>
  for (const id of PANEL_IDS) panels[id] = { ...def.settings.panels[id], ...(s.panels?.[id] ?? {}) }
  return {
    version: 1,
    tasks: Array.isArray(r.tasks) ? (r.tasks as AppData['tasks']) : [],
    completions: Array.isArray(r.completions) ? (r.completions as AppData['completions']) : [],
    nicotine: typeof r.nicotine === 'object' && r.nicotine !== null ? (r.nicotine as AppData['nicotine']) : {},
    profile: { ...emptyProfile(), ...(typeof r.profile === 'object' && r.profile !== null ? (r.profile as Partial<Profile>) : {}) },
    gym: { ...emptyGym(), ...(typeof r.gym === 'object' && r.gym !== null ? (r.gym as Partial<Gym>) : {}) },
    settings: { ...def.settings, ...s, panels }
  }
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
      this.data.settings.panels.settings.visible = false
      this.data.settings.panels.profile.visible = false
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
