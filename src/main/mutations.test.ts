import { describe, it, expect } from 'vitest'
import { addTask, updateTask, deleteTask, setDone, setNicotine, sanitizeSettingsPatch, setProfile, setAvatarStamp } from './mutations'
import { defaultData } from './store'

describe('mutations', () => {
  it('addTask validates and normalises input', () => {
    const d = defaultData()
    const task = addTask(d, { title: '  Gym  ', kind: 'weekly', time: '07:00', weekdays: [3, 1, 3], date: '2026-10-05' }, '2026-10-05', 'id1')
    expect(task).toMatchObject({ id: 'id1', title: 'Gym', weekdays: [1, 3], createdOn: '2026-10-05' })
    expect(task.date).toBeUndefined()
    expect(d.tasks).toHaveLength(1)
  })

  it('addTask rejects invalid input without changing data', () => {
    const d = defaultData()
    expect(() => addTask(d, { title: '', kind: 'daily', time: '' }, '2026-10-05', 'x')).toThrow(/title/i)
    expect(d.tasks).toHaveLength(0)
  })

  it('updateTask replaces fields and keeps identity', () => {
    const d = defaultData()
    addTask(d, { title: 'a', kind: 'daily', time: '08:00' }, '2026-10-05', 'id1')
    updateTask(d, 'id1', { title: 'b', kind: 'once', date: '2026-10-06', time: '' })
    expect(d.tasks[0]).toMatchObject({ id: 'id1', title: 'b', kind: 'once', date: '2026-10-06', time: '' })
    expect(d.tasks[0].weekdays).toBeUndefined()
  })

  it('updateTask ignores unknown ids', () => {
    const d = defaultData()
    expect(() => updateTask(d, 'nope', { title: 'b', kind: 'daily', time: '' })).not.toThrow()
  })

  it('deleteTask archives the task and keeps completions', () => {
    const d = defaultData()
    addTask(d, { title: 'a', kind: 'daily', time: '08:00' }, '2026-10-01', 'id1')
    setDone(d, 'id1', '2026-10-02', true, 'now')
    deleteTask(d, 'id1', '2026-10-05')
    expect(d.tasks[0].archivedOn).toBe('2026-10-05')
    expect(d.completions).toHaveLength(1)
  })

  it('setDone is idempotent and reversible', () => {
    const d = defaultData()
    setDone(d, 'id1', '2026-10-05', true, 'now')
    setDone(d, 'id1', '2026-10-05', true, 'now')
    expect(d.completions).toHaveLength(1)
    setDone(d, 'id1', '2026-10-05', false, 'now')
    expect(d.completions).toHaveLength(0)
  })

  it('setNicotine toggles a day', () => {
    const d = defaultData()
    setNicotine(d, '2026-10-05', true)
    expect(d.nicotine).toEqual({ '2026-10-05': true })
    setNicotine(d, '2026-10-05', false)
    expect(d.nicotine).toEqual({})
  })
})

describe('sanitizeSettingsPatch', () => {
  it('keeps valid fields and clamps opacity', () => {
    expect(sanitizeSettingsPatch({ opacity: 5, accent: 'sage', alwaysOnTop: false, launchAtStartup: true })).toEqual({
      opacity: 1, accent: 'sage', alwaysOnTop: false, launchAtStartup: true
    })
    expect(sanitizeSettingsPatch({ opacity: 0 })).toEqual({ opacity: 0.3 })
  })
  it('drops unknown keys and wrongly typed values', () => {
    expect(sanitizeSettingsPatch({ opacity: 'x', accent: 'pink', alwaysOnTop: 'yes', panels: {}, evil: 1 })).toEqual({})
    expect(sanitizeSettingsPatch({ opacity: NaN })).toEqual({})
  })
  it('returns an empty patch for non-objects', () => {
    expect(sanitizeSettingsPatch(null)).toEqual({})
    expect(sanitizeSettingsPatch('x')).toEqual({})
  })
})

describe('profile mutations', () => {
  const input = { username: ' jiro ', firstName: 'Jiro', dateOfBirth: '2000-01-31', heightCm: 180 }

  it('setProfile trims text and keeps the avatar stamp', () => {
    const d = defaultData()
    d.profile.avatarUpdatedAt = 5
    setProfile(d, input, '2026-10-05')
    expect(d.profile).toEqual({ ...input, username: 'jiro', avatarUpdatedAt: 5 })
  })
  it('setProfile rejects invalid input without changing data', () => {
    const d = defaultData()
    expect(() => setProfile(d, { ...input, heightCm: 5 }, '2026-10-05')).toThrow(/height/i)
    expect(d.profile).toEqual(defaultData().profile)
  })
  it('setAvatarStamp records when the picture changed', () => {
    const d = defaultData()
    setAvatarStamp(d, 123)
    expect(d.profile.avatarUpdatedAt).toBe(123)
  })
})
