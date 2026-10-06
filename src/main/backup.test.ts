import { describe, it, expect } from 'vitest'
import { avatarBytes, buildBackup, parseBackup } from './backup'
import { defaultData } from './store'

describe('backup', () => {
  it('round-trips data and avatar', () => {
    const d = defaultData()
    d.habits.push({ id: 'h1', name: 'Read', icon: 'book' })
    d.habitLog.h1 = { '2026-10-05': true }
    d.pomodoroLog.push({ date: '2026-10-05', endedAt: 1, task: 'Essay' })
    const avatar = `data:image/png;base64,${Buffer.from('png').toString('base64')}`
    const parsed = parseBackup(buildBackup(d, avatar))
    expect(parsed.data).toEqual(d)
    expect(avatarBytes(parsed.avatar!).toString()).toBe('png')
  })

  it('accepts a backup with no avatar', () => {
    expect(parseBackup(buildBackup(defaultData(), null)).avatar).toBeNull()
  })

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('nope')).toThrow(/JSON/)
    expect(() => parseBackup('{"a":1}')).toThrow(/not a ShimaDo backup/)
    expect(() => parseBackup('{"app":"shimado-backup","format":2}')).toThrow(/format/)
    expect(() => parseBackup('{"app":"shimado-backup","format":1,"data":{"version":9}}')).toThrow(/version/)
  })

  it('ignores an avatar that is not a png data url', () => {
    const raw = JSON.parse(buildBackup(defaultData(), null))
    raw.avatar = 'file:///etc/passwd'
    expect(parseBackup(JSON.stringify(raw)).avatar).toBeNull()
  })

  it('falls back to safe theme settings when a backup names unknown ones', () => {
    const raw = JSON.parse(buildBackup(defaultData(), null))
    raw.data.settings.theme = 'neon'
    raw.data.settings.accent = 'purple'
    const parsed = parseBackup(JSON.stringify(raw))
    expect(parsed.data.settings).toMatchObject({ theme: 'classic', accent: 'orange' })
  })

  it('round-trips design overrides and drops bad ones from a backup', () => {
    const d = defaultData()
    d.design = { overrides: { 'bar.label': { text: 'Mine', color: '#ff0000' } } }
    const parsed = parseBackup(buildBackup(d, null))
    expect(parsed.data.design).toEqual(d.design)
    const raw = JSON.parse(buildBackup(d, null))
    raw.data.design.overrides['nope'] = { color: '#fff' }
    raw.data.design.overrides['bar.label'].text = '<script>'
    expect(parseBackup(JSON.stringify(raw)).data.design).toEqual({ overrides: { 'bar.label': { color: '#ff0000' } } })
  })
})
