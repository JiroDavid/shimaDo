import { useEffect, useRef, useState } from 'react'
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
  defaultTime?: string
  onSubmit: (input: TaskInput) => void
  onCancel: () => void
}

const plusHour = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  const mins = Math.min(h * 60 + m + 60, 1439)
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

export function TaskForm({ initial, defaultDate, defaultTime, onSubmit, onCancel }: Props) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = root.current
    const body = el?.closest('.win-body')
    if (!el || !body) return
    const top = el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop
    const bottom = top + el.offsetHeight
    if (top < body.scrollTop) body.scrollTo({ top: Math.max(0, top - 8), behavior: 'smooth' })
    else if (bottom > body.scrollTop + body.clientHeight) body.scrollTo({ top: Math.max(0, bottom - body.clientHeight + 8), behavior: 'smooth' })
  }, [])
  const [title, setTitle] = useState(initial?.title ?? '')
  const [kind, setKind] = useState<TaskKind>(initial?.kind ?? 'once')
  const [date, setDate] = useState(initial?.date ?? defaultDate)
  const [time, setTime] = useState(initial?.time ?? defaultTime ?? '09:00')
  const [endTime, setEndTime] = useState(initial?.endTime ?? '')
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [])
  const [tag, setTag] = useState<TaskTag | undefined>(initial?.tag)
  const [error, setError] = useState<string | null>(null)

  const toggleDay = (d: number) => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]))

  const submit = () => {
    const input: TaskInput = {
      title,
      kind,
      time,
      ...(time && endTime ? { endTime } : {}),
      ...(kind === 'once' ? { date } : {}),
      ...(kind === 'weekly' ? { weekdays } : {}),
      ...(tag ? { tag } : {})
    }
    const problem = validateTaskInput(input)
    if (problem) setError(problem)
    else onSubmit(input)
  }

  return (
    <div className="card space-y-3" ref={root}>
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
        <input className="field" type="time" aria-label="Start time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      {time && (
        <div className="flex items-center gap-2">
          {endTime ? (
            <>
              <span className="panel-label shrink-0">Ends at</span>
              <input className="field" type="time" aria-label="End time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              <button type="button" className="btn !px-3" aria-label="Remove end time" onClick={() => setEndTime('')}>
                ×
              </button>
            </>
          ) : (
            <button type="button" className="btn" onClick={() => setEndTime(plusHour(time))}>
              + End time
            </button>
          )}
        </div>
      )}
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
