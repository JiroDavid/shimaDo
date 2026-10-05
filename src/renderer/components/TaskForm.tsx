import { useState } from 'react'
import type { Task, TaskInput, TaskKind } from '../../shared/types'
import { validateTaskInput } from '../../shared/validate'

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABEL = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface Props {
  initial?: Task
  defaultDate: string
  onSubmit: (input: TaskInput) => void
  onCancel: () => void
}

export function TaskForm({ initial, defaultDate, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [kind, setKind] = useState<TaskKind>(initial?.kind ?? 'once')
  const [date, setDate] = useState(initial?.date ?? defaultDate)
  const [time, setTime] = useState(initial?.time ?? '09:00')
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [])
  const [error, setError] = useState<string | null>(null)

  const toggleDay = (d: number) => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]))

  const submit = () => {
    const input: TaskInput = { title, kind, time, ...(kind === 'once' ? { date } : {}), ...(kind === 'weekly' ? { weekdays } : {}) }
    const problem = validateTaskInput(input)
    if (problem) setError(problem)
    else onSubmit(input)
  }

  return (
    <div className="space-y-2 border border-dark-border p-2">
      <input className="field" placeholder="task title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <div className="flex gap-2">
        <select className="field" value={kind} onChange={(e) => setKind(e.target.value as TaskKind)}>
          <option value="once">once</option>
          <option value="daily">every day</option>
          <option value="weekly">weekly</option>
        </select>
        <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      {kind === 'once' && <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
      {kind === 'weekly' && (
        <div className="flex gap-1">
          {DAY_ORDER.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`btn flex-1 px-0 ${weekdays.includes(d) ? 'border-accent text-accent' : ''}`}
            >
              {DAY_LABEL[d]}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-brick">{error}</p>}
      <div className="flex justify-end gap-2">
        <button className="btn" onClick={onCancel}>
          cancel
        </button>
        <button className="btn" onClick={submit}>
          {initial ? 'save' : 'add'}
        </button>
      </div>
    </div>
  )
}
