import { describe, it, expect } from 'vitest'
import { addRecent, applyPreset, captureRoles, deletePreset, roleOf, sanitizePresets, sanitizeRecent, savePreset, MAX_PRESETS, MAX_RECENT } from './presets'
import { emptyDesign, type Design } from './design'

const withOverrides = (overrides: Design['overrides']): Design => ({ ...emptyDesign(), overrides })

describe('roleOf', () => {
  it('names the role of an element inside its window', () => {
    expect(roleOf('checklist.panel', 'checklist')).toBe('panel')
    expect(roleOf('checklist.card.overdue', 'checklist')).toBe('card')
    expect(roleOf('checklist.heading', 'checklist')).toBe('heading')
    expect(roleOf('gym.heading', 'checklist')).toBeNull()
  })
})

describe('window presets', () => {
  const source = withOverrides({
    'checklist.panel': { background: '#112233', accent: '#ff0000', radius: 10 },
    'checklist.card.overdue': { background: '#223344', shadow: '#000000' },
    'checklist.card.done': { borderColor: '#445566' },
    'checklist.heading': { color: '#abcdef', fontSize: 30 },
    'gym.heading': { color: '#999999' }
  })

  it('captures only the colour fields of the chosen window, merged by role', () => {
    expect(captureRoles(source, 'checklist')).toEqual({
      panel: { background: '#112233', accent: '#ff0000' },
      card: { background: '#223344', shadow: '#000000', borderColor: '#445566' },
      heading: { color: '#abcdef' }
    })
  })

  it('saves under a name, replacing a preset with the same name', () => {
    const one = savePreset(source, 'checklist', 'Night', 'preset-aaaa-1')!
    expect(one.presets).toHaveLength(1)
    const two = savePreset(one, 'checklist', 'night', 'preset-bbbb-2')!
    expect(two.presets.map((p) => p.id)).toEqual(['preset-bbbb-2'])
  })

  it('refuses empty windows, bad names and a full list', () => {
    expect(savePreset(emptyDesign(), 'checklist', 'x', 'preset-aaaa-1')).toBeNull()
    expect(savePreset(source, 'checklist', '', 'preset-aaaa-1')).toBeNull()
    expect(savePreset(source, 'checklist', 'a<b', 'preset-aaaa-1')).toBeNull()
    const full = { ...source, presets: Array.from({ length: MAX_PRESETS }, (_, i) => ({ id: `preset-full-${String(i).padStart(2, '0')}`, name: `n${i}`, roles: {} })) }
    expect(savePreset(full, 'checklist', 'extra', 'preset-zzzz-9')).toBeNull()
  })

  it('applies to another window by role: panel, title, every card and matching elements', () => {
    const saved = savePreset(source, 'checklist', 'Night', 'preset-aaaa-1')!
    const next = applyPreset(saved, 'preset-aaaa-1', 'progress')
    expect(next.overrides['progress.panel']).toEqual({ background: '#112233', accent: '#ff0000' })
    expect(next.overrides['progress.card.consistency']).toEqual({ background: '#223344', shadow: '#000000', borderColor: '#445566' })
    expect(next.overrides['progress.card.tasks-done']).toBeDefined()
    expect(next.overrides['progress.heading']).toBeUndefined()
  })

  it('keeps the target window other settings and ignores unknown presets', () => {
    const saved = savePreset(source, 'checklist', 'Night', 'preset-aaaa-1')!
    const target = { ...saved, overrides: { ...saved.overrides, 'progress.panel': { radius: 4 } } }
    expect(applyPreset(target, 'preset-aaaa-1', 'progress').overrides['progress.panel']).toEqual({ radius: 4, background: '#112233', accent: '#ff0000' })
    expect(applyPreset(saved, 'nope', 'progress')).toBe(saved)
  })

  it('deletes a preset', () => {
    const saved = savePreset(source, 'checklist', 'Night', 'preset-aaaa-1')!
    expect(deletePreset(saved, 'preset-aaaa-1').presets).toEqual([])
    expect(deletePreset(saved, 'nope')).toBe(saved)
  })

  it('sanitises stored presets', () => {
    const out = sanitizePresets([
      { id: 'preset-aaaa-1', name: ' Night ', roles: { panel: { background: '#112233', radius: 5 }, 'bad role!': { color: '#fff' } } },
      { id: 'x', name: 'bad id', roles: {} },
      { id: 'preset-bbbb-2', name: '', roles: {} }
    ])
    expect(out).toEqual([{ id: 'preset-aaaa-1', name: 'Night', roles: { panel: { background: '#112233' } } }])
  })
})

describe('recent colours', () => {
  it('adds newest last, moves repeats to the end and drops the oldest when full', () => {
    let list: string[] = []
    for (let i = 0; i < MAX_RECENT; i++) list = addRecent(list, `#0000${String(i).padStart(2, '0')}`)
    expect(list).toHaveLength(MAX_RECENT)
    list = addRecent(list, '#ffffff')
    expect(list[0]).toBe('#000001')
    expect(list[list.length - 1]).toBe('#ffffff')
    list = addRecent(list, '#000005')
    expect(list[list.length - 1]).toBe('#000005')
    expect(list).toHaveLength(MAX_RECENT)
  })

  it('normalises case and rejects non-hex and translucent values', () => {
    expect(addRecent([], '#ABCDEF')).toEqual(['#abcdef'])
    expect(addRecent([], 'red')).toEqual([])
    expect(addRecent([], 'rgb(1 2 3 / 0.5)')).toEqual([])
    expect(sanitizeRecent(['#112233', '#112233', 5, '#12'])).toEqual(['#112233'])
  })
})
