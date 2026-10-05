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
    a.update((d) => { d.nicotine['2026-10-05'] = true })
    const b = new Store(file)
    b.load()
    expect(b.data.nicotine).toEqual({ '2026-10-05': true })
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
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], nicotine: {}, settings: { opacity: 0.5 } }))
    const s = new Store(file)
    s.load()
    expect(s.data.settings.opacity).toBe(0.5)
    expect(s.data.settings.panels.checklist.visible).toBe(true)
    expect(s.data.settings.alwaysOnTop).toBe(true)
  })

  it('fills a missing or partial profile with empty values', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], nicotine: {}, profile: { firstName: 'Jiro' } }))
    const s = new Store(file)
    s.load()
    expect(s.data.profile).toEqual({ ...defaultData().profile, firstName: 'Jiro' })
    expect(s.data.settings.panels.profile.visible).toBe(false)
  })

  it('fills a missing or partial gym with empty values', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], nicotine: {}, gym: { weighIns: { '2026-10-05': 72 } } }))
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
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], nicotine: {}, settings: { opacity: 0.5 } }))
    const s = new Store(file)
    s.load()
    expect(s.data.settings.textScale).toBe(1)
    expect(s.data.settings.opacity).toBe(0.5)
  })

  it('drops the legacy gym sets field when loading old data', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, JSON.stringify({ version: 1, tasks: [], completions: [], nicotine: {}, gym: { weighIns: { '2026-10-05': 72 }, sets: [{ id: 'x', date: '2026-10-05', exercise: 'Bench', weightKg: 80, reps: 5 }] } }))
    const s = new Store(file)
    s.load()
    expect(Object.keys(s.data.gym).sort()).toEqual(['done', 'overrides', 'splits', 'weighIns'])
    expect(s.data.gym.weighIns).toEqual({ '2026-10-05': 72 })
  })
})
