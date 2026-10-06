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
    d.design = { ...d.design, overrides: { 'bar.label': { text: 'Mine', color: '#ff0000' } } }
    const parsed = parseBackup(buildBackup(d, null))
    expect(parsed.data.design).toEqual(d.design)
    const raw = JSON.parse(buildBackup(d, null))
    raw.data.design.overrides['nope'] = { color: '#fff' }
    raw.data.design.overrides['bar.label'].text = '<script>'
    expect(parseBackup(JSON.stringify(raw)).data.design).toEqual({ ...defaultData().design, overrides: { 'bar.label': { color: '#ff0000' } } })
  })

  const png = () => {
    const a = new Uint8Array(40)
    a.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    return a
  }
  const info = (id: string, ext: 'png' | 'gif' = 'png') => ({ id, ext, bytes: 40, name: 'x', addedAt: 1 })

  it('round-trips images, stickers and backgrounds', () => {
    const d = defaultData()
    d.assets = { 'asset-aaaa-1': info('asset-aaaa-1') }
    d.design = {
      ...d.design,
      stickers: [{ id: 'stk-aaaa-0001', panel: 'bar', kind: 'image', asset: 'asset-aaaa-1', x: 1, y: 1, size: 40, layer: 'front' }],
      backgrounds: { 'bar.surface': { asset: 'asset-aaaa-1', fit: 'cover', opacity: 1 } }
    }
    const parsed = parseBackup(buildBackup(d, null, { 'asset-aaaa-1': png() }))
    expect(Object.keys(parsed.assetFiles)).toEqual(['asset-aaaa-1'])
    expect(parsed.assetFiles['asset-aaaa-1'].length).toBe(40)
    expect(parsed.data.design.stickers).toHaveLength(1)
    expect(Object.keys(parsed.data.design.backgrounds)).toEqual(['bar.surface'])
  })

  it('drops images whose bytes do not match, are missing or have unsafe ids, and what uses them', () => {
    const d = defaultData()
    d.assets = { 'asset-aaaa-1': info('asset-aaaa-1', 'gif'), 'asset-bbbb-2': info('asset-bbbb-2'), 'asset-cccc-3': info('asset-cccc-3') }
    d.design = {
      ...d.design,
      stickers: [
        { id: 'stk-aaaa-0001', panel: 'bar', kind: 'image', asset: 'asset-aaaa-1', x: 1, y: 1, size: 40, layer: 'front' },
        { id: 'stk-bbbb-0002', panel: 'bar', kind: 'image', asset: 'asset-bbbb-2', x: 1, y: 1, size: 40, layer: 'front' },
        { id: 'stk-cccc-0003', panel: 'bar', kind: 'image', asset: 'asset-cccc-3', x: 1, y: 1, size: 40, layer: 'front' }
      ]
    }
    const text = buildBackup(d, null, { 'asset-aaaa-1': png(), 'asset-bbbb-2': png() })
    const raw = JSON.parse(text)
    raw.assetFiles['../escape-12345'] = Buffer.from(png()).toString('base64')
    const parsed = parseBackup(JSON.stringify(raw))
    expect(Object.keys(parsed.assetFiles)).toEqual(['asset-bbbb-2'])
    expect(Object.keys(parsed.data.assets)).toEqual(['asset-bbbb-2'])
    expect(parsed.data.design.stickers.map((s) => s.id)).toEqual(['stk-bbbb-0002'])
  })

  it('still imports a backup that has no images', () => {
    const d = defaultData()
    const raw = JSON.parse(buildBackup(d, null))
    delete raw.assetFiles
    const parsed = parseBackup(JSON.stringify(raw))
    expect(parsed.assetFiles).toEqual({})
    expect(parsed.data.assets).toEqual({})
  })
})
