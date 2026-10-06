import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Store, defaultData } from './store'

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'shimado-'))

describe('Store', () => {
  it('uses defaults when the file is missing', () => {
    const s = new Store(path.join(tmpDir(), 'data.json'))
    s.load()
    expect(s.data).toEqual(defaultData())
    expect(s.data.settings.launchAtStartup).toBe(true)
  })

  it('persists updates and reloads them', () => {
    const file = path.join(tmpDir(), 'data.json')
    const a = new Store(file)
    a.load()
    a.update((d) => { d.habits.push({ id: 'h1', name: 'Read', icon: 'book' }); d.habitLog.h1 = { '2026-10-05': true } })
    const b = new Store(file)
    b.load()
    expect(b.data.habitLog).toEqual({ h1: { '2026-10-05': true } })
  })

  it('leaves no temp file behind after saving', () => {
    const dir = tmpDir()
    const s = new Store(path.join(dir, 'data.json'))
    s.load()
    s.update(() => {})
    expect(fs.readdirSync(dir)).toEqual(['data.json'])
  })

  it('backs up a corrupt file and starts fresh', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, '{not json')
    const s = new Store(file)
    s.load()
    expect(s.data).toEqual(defaultData())
    expect(fs.readdirSync(dir).some((f) => f.includes('.corrupt-'))).toBe(true)
  })

  it('backs up an empty file', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, '')
    new Store(file).load()
    expect(fs.readdirSync(dir).some((f) => f.includes('.corrupt-'))).toBe(true)
  })

  it('backs up data written by a newer version instead of overwriting it', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 99 }))
    const s = new Store(file)
    s.load()
    expect(s.data.version).toBe(1)
    expect(fs.readdirSync(dir).some((f) => f.includes('.corrupt-'))).toBe(true)
  })

  it('fills missing settings from defaults', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], habits: [], habitLog: {}, settings: { opacity: 0.5 } }))
    const s = new Store(file)
    s.load()
    expect(s.data.settings.opacity).toBe(0.5)
    expect(s.data.settings.panels.checklist.visible).toBe(true)
    expect(s.data.settings.alwaysOnTop).toBe(true)
  })

  it('fills a missing or partial profile with empty values', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], habits: [], habitLog: {}, profile: { firstName: 'Jiro' } }))
    const s = new Store(file)
    s.load()
    expect(s.data.profile).toEqual({ ...defaultData().profile, firstName: 'Jiro' })
    expect(s.data.settings.panels.profile.visible).toBe(false)
  })

  it('fills a missing or partial gym with empty values', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], habits: [], habitLog: {}, gym: { weighIns: { '2026-10-05': 72 } } }))
    const s = new Store(file)
    s.load()
    expect(s.data.gym).toEqual({ ...defaultData().gym, weighIns: { '2026-10-05': 72 } })
    expect(s.data.settings.panels.gym.visible).toBe(false)
  })

  it('does not restore the centered panels as open after a restart', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    const first = new Store(file)
    first.load()
    first.update((d) => {
      d.settings.panels.settings.visible = true
      d.settings.panels.profile.visible = true
      d.settings.panels.gym.visible = true
      d.settings.panels.confirm.visible = true
      d.settings.panels.mini.visible = true
    })
    const second = new Store(file)
    second.load()
    expect(second.data.settings.panels.settings.visible).toBe(false)
    expect(second.data.settings.panels.profile.visible).toBe(false)
    expect(second.data.settings.panels.confirm.visible).toBe(false)
    expect(second.data.settings.panels.mini.visible).toBe(false)
    expect(second.data.settings.panels.gym.visible).toBe(true)
  })

  it('gives old data files a text scale of 1', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], habits: [], habitLog: {}, settings: { opacity: 0.5 } }))
    const s = new Store(file)
    s.load()
    expect(s.data.settings.textScale).toBe(1)
    expect(s.data.settings.opacity).toBe(0.5)
  })

  it('drops the legacy gym sets field when loading old data', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], habits: [], habitLog: {}, gym: { weighIns: { '2026-10-05': 72 }, sets: [{ id: 'x', date: '2026-10-05', exercise: 'Bench', weightKg: 80, reps: 5 }] } }))
    const s = new Store(file)
    s.load()
    expect(Object.keys(s.data.gym).sort()).toEqual(['done', 'overrides', 'splits', 'weighIns'])
    expect(s.data.gym.weighIns).toEqual({ '2026-10-05': 72 })
  })

  it('turns the legacy nicotine log into a habit and keeps its panel position', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({
      version: 1, tasks: [], completions: [], nicotine: { '2026-10-05': true },
      settings: { panels: { nicotine: { width: 410, height: 333, visible: false } } }
    }))
    const s = new Store(file)
    s.load()
    expect(s.data.habits).toEqual([{ id: 'nicotine', name: 'No nicotine', icon: 'ban' }])
    expect(s.data.habitLog).toEqual({ nicotine: { '2026-10-05': true } })
    expect(s.data.settings.panels.habits).toMatchObject({ width: 410, height: 333, visible: false })
    expect('nicotine' in s.data).toBe(false)
  })

  it('cleans up malformed habits when loading', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({
      version: 1, tasks: [], completions: [],
      habits: [{ id: 'a', name: ' Read ', icon: 'nope' }, { id: 'a', name: 'dupe', icon: 'book' }, { id: 'b', name: '' }, 5],
      habitLog: { a: { '2026-10-05': true }, b: { '2026-10-05': true }, ghost: {} }
    }))
    const s = new Store(file)
    s.load()
    expect(s.data.habits).toEqual([{ id: 'a', name: 'Read', icon: 'check' }])
    expect(s.data.habitLog).toEqual({ a: { '2026-10-05': true } })
  })

  it('keeps saved notes and defaults old files to an empty note', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], notes: 'remember milk' }))
    const s = new Store(file)
    s.load()
    expect(s.data.notes).toBe('remember milk')
    expect(s.data.settings.panels.notepad.visible).toBe(false)
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], notes: 5 }))
    s.load()
    expect(s.data.notes).toBe('')
  })

  it('drops end times that cannot be valid when loading', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    const t = (id: string, time: string, endTime?: string) => ({ id, title: id, kind: 'daily', time, endTime, createdOn: '2026-10-01' })
    fs.writeFileSync(file, JSON.stringify({
      version: 1, completions: [],
      tasks: [t('ok', '09:00', '10:00'), t('early', '09:00', '08:00'), t('bad', '09:00', 'soon'), t('untimed', '', '10:00'), t('none', '09:00')]
    }))
    const s = new Store(file)
    s.load()
    const byId = Object.fromEntries(s.data.tasks.map((x) => [x.id, x.endTime]))
    expect(byId).toEqual({ ok: '10:00', early: undefined, bad: undefined, untimed: undefined, none: undefined })
  })

  it('defaults old files to the classic theme, keeps their accent and marks them onboarded', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], settings: { accent: 'sage' } }))
    const s = new Store(file)
    s.load()
    expect(s.data.settings).toMatchObject({ theme: 'classic', accent: 'sage', onboarded: true })
  })

  it('falls back from an unknown theme and an invalid accent', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], settings: { theme: 'neon', accent: 'purple', onboarded: false } }))
    const s = new Store(file)
    s.load()
    expect(s.data.settings).toMatchObject({ theme: 'classic', accent: 'orange', onboarded: false })
  })

  it('keeps a custom accent as lowercase hex and a known theme', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], settings: { theme: 'sakura', accent: '#ABCDEF' } }))
    const s = new Store(file)
    s.load()
    expect(s.data.settings).toMatchObject({ theme: 'sakura', accent: '#abcdef' })
  })

  it('starts a fresh install not onboarded', () => {
    expect(defaultData().settings).toMatchObject({ theme: 'classic', accent: 'orange', onboarded: false })
  })

  it('keeps the welcome panel hidden on load', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], settings: { panels: { welcome: { width: 500, height: 500, visible: true } } } }))
    const s = new Store(file)
    s.load()
    expect(s.data.settings.panels.welcome.visible).toBe(false)
  })

  it('defaults to no design overrides', () => {
    expect(defaultData().design).toEqual({ overrides: {} })
  })

  it('loads old files with no design as empty', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [] }))
    const s = new Store(file)
    s.load()
    expect(s.data.design).toEqual({ overrides: {} })
  })

  it('keeps valid overrides and drops stale or invalid ones on load', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({
      version: 1, tasks: [], completions: [],
      design: { overrides: { 'bar.label': { text: 'Hi', color: 'url(x)' }, 'gone.element': { color: '#fff' }, 'group:button': { radius: 99999, background: '#112233' } } }
    }))
    const s = new Store(file)
    s.load()
    expect(s.data.design).toEqual({ overrides: { 'bar.label': { text: 'Hi' }, 'group:button': { background: '#112233' } } })
  })
})
