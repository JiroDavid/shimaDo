import { describe, it, expect } from 'vitest'
import { occurrencesOn } from '../shared/recurrence'
import { addTask, updateTask, deleteTask, setDone, addHabit, updateHabit, deleteHabit, setHabitDay, addPomodoro, claimWelcome, setNotes, sanitizeSettingsPatch, setProfile, setAvatarStamp } from './mutations'
import { defaultData } from './store'

describe('mutations', () => {
  it('addTask validates and normalises input', () => {
    const d = defaultData()
    const task = addTask(d, { title: '  Gym  ', kind: 'weekly', time: '07:00', weekdays: [3, 1, 3], date: '2026-10-05' }, '2026-10-05', 'id1')
    expect(task).toMatchObject({ id: 'id1', title: 'Gym', weekdays: [1, 3], createdOn: '2026-10-05' })
    expect(task.date).toBeUndefined()
    expect(d.tasks).toHaveLength(1)
  })

  it('addTask keeps a valid end time and drops a blank one', () => {
    const d = defaultData()
    expect(addTask(d, { title: 'Study', kind: 'daily', time: '09:00', endTime: '10:30' }, '2026-10-05', 'a').endTime).toBe('10:30')
    expect(addTask(d, { title: 'Study', kind: 'daily', time: '09:00', endTime: '' }, '2026-10-05', 'b')).not.toHaveProperty('endTime')
    expect(() => addTask(d, { title: 'Study', kind: 'daily', time: '09:00', endTime: '08:00' }, '2026-10-05', 'c')).toThrow(/after/i)
  })

  it('updateTask can add and remove an end time', () => {
    const d = defaultData()
    addTask(d, { title: 'Study', kind: 'daily', time: '09:00' }, '2026-10-05', 'a')
    updateTask(d, 'a', { title: 'Study', kind: 'daily', time: '09:00', endTime: '11:00' }, '2026-10-05', 'n')
    expect(d.tasks[0].endTime).toBe('11:00')
    updateTask(d, 'a', { title: 'Study', kind: 'daily', time: '09:00' }, '2026-10-05', 'n')
    expect(d.tasks[0]).not.toHaveProperty('endTime')
  })

  it('addTask rejects invalid input without changing data', () => {
    const d = defaultData()
    expect(() => addTask(d, { title: '', kind: 'daily', time: '' }, '2026-10-05', 'x')).toThrow(/title/i)
    expect(d.tasks).toHaveLength(0)
  })

  it('updateTask replaces fields and keeps identity', () => {
    const d = defaultData()
    addTask(d, { title: 'a', kind: 'daily', time: '08:00' }, '2026-10-05', 'id1')
    updateTask(d, 'id1', { title: 'b', kind: 'once', date: '2026-10-06', time: '' }, '2026-10-05', 'new1')
    expect(d.tasks[0]).toMatchObject({ id: 'id1', title: 'b', kind: 'once', date: '2026-10-06', time: '' })
    expect(d.tasks[0].weekdays).toBeUndefined()
  })

  it('updateTask ignores unknown ids', () => {
    const d = defaultData()
    expect(() => updateTask(d, 'nope', { title: 'b', kind: 'daily', time: '' }, '2026-10-05', 'new1')).not.toThrow()
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

  it('addPomodoro increments the day count', () => {
    const d = defaultData()
    addPomodoro(d, '2026-10-05')
    addPomodoro(d, '2026-10-05')
    expect(d.pomodoros).toEqual({ '2026-10-05': 2 })
    expect(d.pomodoroLog).toHaveLength(2)
  })

  it('addPomodoro records the task name', () => {
    const d = defaultData()
    addPomodoro(d, '2026-10-05', 'Essay', 123)
    expect(d.pomodoroLog).toEqual([{ date: '2026-10-05', endedAt: 123, task: 'Essay' }])
  })

  it('sanitizeSettingsPatch accepts slot ids and normalises custom accents', () => {
    expect(sanitizeSettingsPatch({ accent: 'brick' })).toEqual({ accent: 'brick' })
    expect(sanitizeSettingsPatch({ accent: '#ABC' })).toEqual({ accent: '#aabbcc' })
    expect(sanitizeSettingsPatch({ accent: ' #AbCdEf ' })).toEqual({ accent: '#abcdef' })
  })

  it('sanitizeSettingsPatch rejects junk accents', () => {
    for (const accent of ['purple', 'abc', '#12', '#fff; x', 5, null, {}]) expect(sanitizeSettingsPatch({ accent })).toEqual({})
  })

  it('sanitizeSettingsPatch only accepts known theme ids', () => {
    expect(sanitizeSettingsPatch({ theme: 'midnight' })).toEqual({ theme: 'midnight' })
    for (const theme of ['neon', '', 5, null, '__proto__']) expect(sanitizeSettingsPatch({ theme })).toEqual({})
  })

  it('claimWelcome fires exactly once on a fresh install', () => {
    const d = defaultData()
    expect(claimWelcome(d)).toBe(true)
    expect(d.settings.onboarded).toBe(true)
    expect(claimWelcome(d)).toBe(false)
  })

  it('claimWelcome never fires for an upgraded install', () => {
    const d = defaultData()
    d.settings.onboarded = true
    expect(claimWelcome(d)).toBe(false)
  })

  it('setNotes stores text and caps its length', () => {
    const d = defaultData()
    setNotes(d, 'hello\nworld')
    expect(d.notes).toBe('hello\nworld')
    setNotes(d, 'x'.repeat(60_000))
    expect(d.notes).toHaveLength(50_000)
    setNotes(d, 42 as never)
    expect(d.notes).toHaveLength(50_000)
  })

  it('setHabitDay toggles a day for an existing habit', () => {
    const d = defaultData()
    addHabit(d, { name: 'Read', icon: 'book' }, 'h1')
    setHabitDay(d, 'h1', '2026-10-05', true)
    expect(d.habitLog).toEqual({ h1: { '2026-10-05': true } })
    setHabitDay(d, 'h1', '2026-10-05', false)
    expect(d.habitLog).toEqual({ h1: {} })
  })

  it('setHabitDay ignores unknown habits and bad dates', () => {
    const d = defaultData()
    addHabit(d, { name: 'Read', icon: 'book' }, 'h1')
    setHabitDay(d, 'nope', '2026-10-05', true)
    setHabitDay(d, 'h1', 'not-a-date', true)
    expect(d.habitLog).toEqual({})
  })

  it('addHabit trims and validates', () => {
    const d = defaultData()
    expect(addHabit(d, { name: '  Read  ', icon: 'book' }, 'h1')).toEqual({ id: 'h1', name: 'Read', icon: 'book' })
    expect(() => addHabit(d, { name: '   ', icon: 'book' }, 'h2')).toThrow(/name/)
    expect(() => addHabit(d, { name: 'x', icon: 'rocket' as never }, 'h2')).toThrow(/icon/)
    expect(d.habits).toHaveLength(1)
  })

  it('addHabit stops at the habit limit', () => {
    const d = defaultData()
    for (let i = 0; i < 12; i++) addHabit(d, { name: `h${i}`, icon: 'check' }, `id${i}`)
    expect(() => addHabit(d, { name: 'one more', icon: 'check' }, 'x')).toThrow(/up to 12/)
  })

  it('updateHabit renames and deleteHabit drops the log too', () => {
    const d = defaultData()
    addHabit(d, { name: 'Read', icon: 'book' }, 'h1')
    setHabitDay(d, 'h1', '2026-10-05', true)
    updateHabit(d, 'h1', { name: 'Study', icon: 'star' })
    expect(d.habits[0]).toEqual({ id: 'h1', name: 'Study', icon: 'star' })
    deleteHabit(d, 'h1')
    expect(d.habits).toEqual([])
    expect(d.habitLog).toEqual({})
  })

  it('clamps the text scale to a readable range and defaults to 1', () => {
    expect(sanitizeSettingsPatch({ textScale: 5 })).toEqual({ textScale: 1.4 })
    expect(sanitizeSettingsPatch({ textScale: 0.1 })).toEqual({ textScale: 0.8 })
    expect(sanitizeSettingsPatch({ textScale: 1.2 })).toEqual({ textScale: 1.2 })
    expect(sanitizeSettingsPatch({ textScale: NaN })).toEqual({})
    expect(defaultData().settings.textScale).toBe(1)
  })
  it('accepts the orange accent and new installs default to it', () => {
    expect(sanitizeSettingsPatch({ accent: 'orange' })).toEqual({ accent: 'orange' })
    expect(defaultData().settings.accent).toBe('orange')
  })
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

describe('updateTask and history', () => {
  const weeklyMon = { title: 'Gym', kind: 'weekly' as const, time: '07:00', weekdays: [1] }

  it('a schedule change on an older recurring task archives it and starts a new one today', () => {
    const d = defaultData()
    addTask(d, weeklyMon, '2026-10-01', 'old')
    setDone(d, 'old', '2026-10-05', true, 'now')
    updateTask(d, 'old', { ...weeklyMon, weekdays: [1, 3] }, '2026-10-06', 'new')
    expect(d.tasks.find((t) => t.id === 'old')?.archivedOn).toBe('2026-10-06')
    expect(d.tasks.find((t) => t.id === 'new')).toMatchObject({ createdOn: '2026-10-06', weekdays: [1, 3] })
    expect(d.completions).toHaveLength(1)
    expect(occurrencesOn(d, '2026-10-02').filter((o) => o.task.id === 'new')).toEqual([])
    expect(occurrencesOn(d, '2026-10-05').map((o) => o.task.id)).toEqual(['old'])
  })
  it('title or time edits stay in place', () => {
    const d = defaultData()
    addTask(d, weeklyMon, '2026-10-01', 'old')
    updateTask(d, 'old', { ...weeklyMon, title: 'Lift', time: '08:00' }, '2026-10-06', 'new')
    expect(d.tasks).toHaveLength(1)
    expect(d.tasks[0]).toMatchObject({ id: 'old', title: 'Lift', createdOn: '2026-10-01' })
  })
  it('turning an old one-off into a recurring task starts it today, not at its creation', () => {
    const d = defaultData()
    addTask(d, { title: 'x', kind: 'once', date: '2026-10-01', time: '' }, '2026-10-01', 'old')
    updateTask(d, 'old', { title: 'x', kind: 'daily', time: '' }, '2026-10-06', 'new')
    expect(d.tasks).toHaveLength(1)
    expect(d.tasks[0]).toMatchObject({ id: 'old', createdOn: '2026-10-06' })
  })
})

describe('task tags', () => {
  const base = { title: 'Gym', kind: 'weekly' as const, time: '07:00', weekdays: [1] }
  it('addTask stores a tag only when given', () => {
    const d = defaultData()
    addTask(d, { ...base, tag: 'must' }, '2026-10-01', 'a')
    addTask(d, base, '2026-10-01', 'b')
    expect(d.tasks[0].tag).toBe('must')
    expect('tag' in d.tasks[1]).toBe(false)
  })
  it('changing or removing a tag edits an older recurring task in place', () => {
    const d = defaultData()
    addTask(d, { ...base, tag: 'must' }, '2026-10-01', 'a')
    updateTask(d, 'a', { ...base, tag: 'urgent' }, '2026-10-06', 'new')
    expect(d.tasks).toHaveLength(1)
    expect(d.tasks[0]).toMatchObject({ id: 'a', tag: 'urgent', createdOn: '2026-10-01' })
    updateTask(d, 'a', base, '2026-10-06', 'new')
    expect('tag' in d.tasks[0]).toBe(false)
  })
})
