import { useState } from 'react'
import type { AppData, Habit } from '../../shared/types'
import { HABIT_ICONS, MAX_HABITS, MAX_HABIT_NAME, type HabitIconId } from '../../shared/habits'
import { fromDateKey, weekDays } from '../../shared/dates'
import { habitStreak, habitWeeks } from '../../shared/stats'
import { BarChart } from '../components/BarChart'
import { HabitIcon } from '../components/icons'
import { Section } from '../components/Section'
import { Check } from '../components/TaskRow'
import { useToday } from '../hooks/useData'

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

type Mode = { kind: 'view' } | { kind: 'add' } | { kind: 'edit' }

export function Habits({ data }: { data: AppData }) {
  const today = useToday()
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<HabitIconId>('check')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  const habit = data.habits.find((h) => h.id === pickedId) ?? data.habits[0]
  const editing = mode.kind !== 'view' || !habit

  const open = (kind: 'add' | 'edit', from?: Habit) => {
    setName(from?.name ?? '')
    setIcon(from?.icon ?? 'check')
    setConfirmDelete(false)
    setError('')
    setMode({ kind })
  }
  const close = () => setMode({ kind: 'view' })

  const save = async () => {
    try {
      if (mode.kind === 'edit' && habit) await window.shima.updateHabit(habit.id, { name, icon })
      else await window.shima.addHabit({ name, icon })
      close()
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : 'Could not save')
    }
  }

  const remove = () => {
    if (!habit) return
    if (!confirmDelete) return setConfirmDelete(true)
    window.shima.deleteHabit(habit.id)
    setPickedId(null)
    close()
  }

  const chips = (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {data.habits.map((h) => (
        <button
          key={h.id}
          className={`btn ${h.id === habit?.id ? 'btn-active' : ''}`}
          onClick={() => (setPickedId(h.id), close())}
        >
          <HabitIcon id={h.icon} />
          <span className="max-w-[9rem] truncate">{h.name}</span>
        </button>
      ))}
      {data.habits.length < MAX_HABITS && (
        <button className={`btn ${mode.kind === 'add' ? 'btn-active' : ''}`} onClick={() => open('add')} aria-label="Add habit">
          + New
        </button>
      )}
    </div>
  )

  if (editing) {
    const adding = mode.kind === 'add' || !habit
    return (
      <div className="space-y-2 pb-2">
        {data.habits.length > 0 && chips}
        <Section label={adding ? 'New habit' : 'Edit habit'}>
          <div className="space-y-2 pb-2">
            <input
              className="field"
              placeholder="e.g. Read 20 minutes"
              aria-label="Habit name"
              maxLength={MAX_HABIT_NAME}
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Habit icon">
              {HABIT_ICONS.map((id) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={icon === id}
                  aria-label={id}
                  className={`btn !min-h-[38px] !px-2.5 ${icon === id ? 'btn-active' : ''}`}
                  onClick={() => setIcon(id)}
                >
                  <HabitIcon id={id} />
                </button>
              ))}
            </div>
            {error && <div className="text-[0.85rem] font-bold text-urgent">{error}</div>}
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={save}>Save</button>
              {habit && <button className="btn" onClick={close}>Cancel</button>}
              {!adding && (
                <button className={`btn ml-auto ${confirmDelete ? 'btn-danger' : ''}`} onClick={remove}>
                  {confirmDelete ? 'Really delete?' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        </Section>
      </div>
    )
  }

  const log = data.habitLog[habit.id] ?? {}
  const days = weekDays(today)
  const weeks = habitWeeks(log, today, 8)
  const thisWeek = days.filter((k) => log[k]).length
  const streak = habitStreak(log, today)

  return (
    <div className="space-y-2 pb-2">
      {chips}
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-1">
        <div>
          <div className="panel-label">Streak</div>
          <div className="heading text-[2.5rem] text-accent" data-el="habits.streak">{streak} {streak === 1 ? 'day' : 'days'}</div>
        </div>
        <div className="pb-1 text-right">
          <div className="panel-label">This week</div>
          <div className="heading text-[1.6rem]">{thisWeek}/7</div>
        </div>
      </div>

      <Section label="Tick off each day" count={habit.name}>
        <div className="flex gap-1.5 pb-1">
          {days.map((k) => {
            const on = Boolean(log[k])
            const isToday = k === today
            return (
              <div
                key={k}
                className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 py-2.5 transition ${
                  isToday ? 'border-accent bg-overlay-soft' : 'border-transparent'
                }`}
              >
                <span className={`text-[0.8rem] font-extrabold ${isToday ? 'text-accent' : 'text-muted'}`}>{LETTERS[fromDateKey(k).getDay()]}</span>
                <Check checked={on} onChange={() => window.shima.setHabitDay(habit.id, k, !on)} label={`${habit.name} on ${k}`} />
                <span className={`text-[0.75rem] font-bold ${isToday ? 'text-accent' : 'text-muted'}`}>{k.slice(8).replace(/^0/, '')}</span>
              </div>
            )
          })}
        </div>
      </Section>

      <Section label="Days per week">
        <BarChart values={weeks.map((w) => w.count)} labels={weeks.map((w) => w.weekStart.slice(5))} max={7} />
      </Section>

      <div className="flex justify-end">
        <button className="btn" onClick={() => open('edit', habit)}>Edit habit</button>
      </div>
    </div>
  )
}
