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
      d.settings.panels.update.visible = true
      d.settings.panels.mini.visible = true
    })
    const second = new Store(file)
    second.load()
    expect(second.data.settings.panels.settings.visible).toBe(false)
    expect(second.data.settings.panels.profile.visible).toBe(false)
    expect(second.data.settings.panels.confirm.visible).toBe(false)
    expect(second.data.settings.panels.update.visible).toBe(false)
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
      settings: { layoutVersion: 3, panels: { nicotine: { width: 410, height: 333, visible: false } } }
    }))
    const s = new Store(file)
    s.load()
    expect(s.data.habits).toEqual([{ id: 'nicotine', name: 'No nicotine', icon: 'ban' }])
    expect(s.data.habitLog).toEqual({ nicotine: { '2026-10-05': true } })
    expect(s.data.settings.panels.habits).toMatchObject({ width: 410, height: 333, visible: false })
    expect('nicotine' in s.data).toBe(false)
  })

  it('resets window sizes once when upgrading from the reflow layout, keeping positions and visibility', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({
      version: 1, tasks: [], completions: [],
      settings: { panels: { checklist: { x: 40, y: 50, width: 900, height: 1000, visible: true }, bar: { width: 777, height: 50, visible: true } } }
    }))
    const s = new Store(file)
    s.load()
    expect(s.data.settings.panels.checklist).toMatchObject({ x: 40, y: 50, width: 300, height: 440, visible: true })
    expect(s.data.settings.panels.bar.width).toBe(777)
    expect(s.data.settings.layoutVersion).toBe(3)
  })

  it('keeps window sizes and a valid zoom once the layout is current, and drops a bad zoom', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({
      version: 1, tasks: [], completions: [],
      settings: { layoutVersion: 3, panels: { checklist: { width: 450, height: 600, visible: true, zoom: 1.3 }, gym: { width: 350, height: 470, visible: false, zoom: 99 }, focus: { width: 280, height: 360, visible: false, zoom: 1 } } }
    }))
    const s = new Store(file)
    s.load()
    expect(s.data.settings.panels.checklist).toMatchObject({ width: 450, height: 600, zoom: 1.3 })
    expect(s.data.settings.panels.gym.zoom).toBe(5)
    expect(s.data.settings.panels.focus.zoom).toBeUndefined()
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

  it('turns the old single note into page 1 and defaults junk to a blank page', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], notes: 'remember milk' }))
    const s = new Store(file)
    s.load()
    expect(s.data.pages).toEqual([{ id: 'page-1', title: 'Page 1', text: 'remember milk' }])
    expect(s.data.activePage).toBe('page-1')
    expect(s.data.settings.panels.notepad.visible).toBe(false)
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], notes: 5 }))
    s.load()
    expect(s.data.pages).toEqual([{ id: 'page-1', title: 'Page 1', text: '' }])
  })

  it('keeps saved pages and the active page across a reload', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    const pages = [{ id: 'a', title: 'Todo', text: 'x' }, { id: 'b', title: 'Ideas', text: 'y' }]
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], pages, activePage: 'b' }))
    const s = new Store(file)
    s.load()
    expect(s.data.pages).toEqual(pages)
    expect(s.data.activePage).toBe('b')
  })

  it('defaults the spotify client id and drops a junk one on load', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [] }))
    const s = new Store(file)
    s.load()
    expect(s.data.settings.spotifyClientId).toBe('')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], settings: { spotifyClientId: 'junk' } }))
    s.load()
    expect(s.data.settings.spotifyClientId).toBe('')
    const id = 'cd34'.repeat(8)
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], settings: { spotifyClientId: id } }))
    s.load()
    expect(s.data.settings.spotifyClientId).toBe(id)
  })

  it('adds the spotify panel hidden by default to old files', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], settings: { panels: {} } }))
    const s = new Store(file)
    s.load()
    expect(s.data.settings.panels.spotify).toMatchObject({ visible: false })
  })

  it('defaults the spotify style to classic and drops an unknown one', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [] }))
    const s = new Store(file)
    s.load()
    expect(s.data.settings.spotifyStyle).toBe('classic')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], settings: { spotifyStyle: 'neon' } }))
    s.load()
    expect(s.data.settings.spotifyStyle).toBe('classic')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], settings: { spotifyStyle: 'visualizer' } }))
    s.load()
    expect(s.data.settings.spotifyStyle).toBe('visualizer')
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
    expect(defaultData().design).toEqual({ overrides: {}, moves: {}, stickers: [], backgrounds: {}, order: {}, recentColors: [], presets: [] })
  })

  it('loads old files with no design as empty', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [] }))
    const s = new Store(file)
    s.load()
    expect(s.data.design).toEqual({ overrides: {}, moves: {}, stickers: [], backgrounds: {}, order: {}, recentColors: [], presets: [] })
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
    expect(s.data.design).toMatchObject({ overrides: { 'bar.label': { text: 'Hi' }, 'group:button': { background: '#112233' } }, moves: {}, stickers: [], backgrounds: {}, order: {}, recentColors: [], presets: [] })
  })

  it('never starts with the designer window open', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], settings: { panels: { designer: { width: 320, height: 640, visible: true } } } }))
    const s = new Store(file)
    s.load()
    expect(s.data.settings.panels.designer.visible).toBe(false)
  })

  it('defaults to no assets and drops stickers whose asset is not in the index', () => {
    expect(defaultData().assets).toEqual({})
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({
      version: 1, tasks: [], completions: [],
      assets: { 'asset-aaaa-1': { id: 'asset-aaaa-1', ext: 'png', bytes: 5, name: 'a', addedAt: 1 } },
      design: { overrides: {}, stickers: [
        { id: 'stk-aaaa-0001', panel: 'bar', kind: 'image', asset: 'asset-aaaa-1', x: 1, y: 1, size: 40, layer: 'front' },
        { id: 'stk-bbbb-0002', panel: 'bar', kind: 'image', asset: 'gone-asset-1', x: 1, y: 1, size: 40, layer: 'front' }
      ] }
    }))
    const s = new Store(file)
    s.load()
    expect(Object.keys(s.data.assets)).toEqual(['asset-aaaa-1'])
    expect(s.data.design.stickers.map((x) => x.id)).toEqual(['stk-aaaa-0001'])
  })
})
