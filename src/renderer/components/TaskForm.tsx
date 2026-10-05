import { useState } from 'react'
import { TASK_TAGS, TAG_LABELS, type Task, type TaskInput, type TaskKind, type TaskTag } from '../../shared/types'
import { validateTaskInput } from '../../shared/validate'

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABEL = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const KINDS: { id: TaskKind; label: string }[] = [
  { id: 'once', label: 'Once' },
  { id: 'daily', label: 'Every day' },
  { id: 'weekly', label: 'Weekly' }
]

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
  const [tag, setTag] = useState<TaskTag | undefined>(initial?.tag)
  const [error, setError] = useState<string | null>(null)

  const toggleDay = (d: number) => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]))

  const submit = () => {
    const input: TaskInput = {
      title,
      kind,
      time,
      ...(kind === 'once' ? { date } : {}),
      ...(kind === 'weekly' ? { weekdays } : {}),
      ...(tag ? { tag } : {})
    }
    const problem = validateTaskInput(input)
    if (problem) setError(problem)
    else onSubmit(input)
  }

  return (
    <div className="card space-y-3">
      <div className="card-label">{initial ? 'Edit task' : 'New task'}</div>
      <input className="field" placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button key={k.id} type="button" className={`btn ${kind === k.id ? 'btn-active' : ''}`} onClick={() => setKind(k.id)}>
            {k.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {kind === 'once' && <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      {kind === 'weekly' && (
        <div className="flex gap-1.5">
          {DAY_ORDER.map((d) => (
            <button key={d} type="button" onClick={() => toggleDay(d)} className={`btn flex-1 !px-0 ${weekdays.includes(d) ? 'btn-active' : ''}`}>
              {DAY_LABEL[d]}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {TASK_TAGS.map((t) => (
          <button key={t} type="button" className={`tag tag-${t} tag-chip`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? undefined : t)}>
            {TAG_LABELS[t]}
          </button>
        ))}
      </div>
      {error && <p className="font-bold text-urgent">{error}</p>}
      <div className="flex justify-end gap-2">
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={submit}>
          {initial ? 'Save' : 'Add task'}
        </button>
      </div>
    </div>
  )
}
