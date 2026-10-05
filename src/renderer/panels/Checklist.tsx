import { useState } from 'react'
import { TASK_TAGS, TAG_LABELS, type AppData, type Occurrence, type TaskTag } from '../../shared/types'
import { dueMs, formatDay } from '../../shared/dates'
import { occurrencesOn, overdueOnce } from '../../shared/recurrence'
import { validateTaskInput } from '../../shared/validate'
import { Section } from '../components/Section'
import { TaskRow } from '../components/TaskRow'
import { useNow, useToday } from '../hooks/useData'

function QuickAdd({ today }: { today: string }) {
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [tag, setTag] = useState<TaskTag | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const add = async () => {
    if (busy) return
    const input = { title, kind: 'once' as const, date: today, time, ...(tag ? { tag } : {}) }
    const problem = validateTaskInput(input)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    await window.shima.addTask(input)
    setTitle('')
    setTime('')
    setTag(undefined)
    setError(null)
    setBusy(false)
  }

  return (
    <div className="quick-add space-y-2.5">
      <div className="flex gap-2">
        <input
          className="field"
          placeholder="Add a task for today..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && add()}
        />
        <button className="btn btn-primary shrink-0" onClick={add}>
          Add
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input className="field !w-[7.5rem] !min-h-[36px]" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="time" />
        {TASK_TAGS.map((t) => (
          <button key={t} className={`tag tag-${t} tag-chip`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? undefined : t)}>
            {TAG_LABELS[t]}
          </button>
        ))}
      </div>
      {error && <p className="font-bold text-urgent">{error}</p>}
    </div>
  )
}

export function Checklist({ data }: { data: AppData }) {
  const today = useToday()
  const now = useNow()

  const todays = occurrencesOn(data, today)
  const isLate = (o: Occurrence) => !o.done && o.task.time !== '' && dueMs(o.date, o.task.time) < now
  const late = [...overdueOnce(data, today), ...todays.filter(isLate)]
  const pending = todays.filter((o) => !o.done && !isLate(o))
  const finished = todays.filter((o) => o.done)
  const percent = todays.length === 0 ? 0 : Math.round((finished.length / todays.length) * 100)

  const toggle = (o: Occurrence) => window.shima.setDone(o.task.id, o.date, !o.done)

  return (
    <div className="flex min-h-full flex-col">
      <div className="pt-2">
        <h1 className="heading text-[2.3rem]">Things to do today</h1>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-bold text-muted">{formatDay(today)}</span>
          <span className="font-extrabold text-accent">
            {finished.length}/{todays.length} done
          </span>
        </div>
        <div className="meter mt-2.5">
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="flex-1">
        {late.length + pending.length + finished.length === 0 && (
          <p className="py-10 text-center text-lg font-bold text-muted">Nothing planned. Add your first task below.</p>
        )}
        {late.length > 0 && (
          <Section label="Overdue" count={late.length}>
            {late.map((o) => (
              <TaskRow key={`${o.task.id}-${o.date}`} occ={o} overdue showDate={o.date !== today} onToggle={() => toggle(o)} />
            ))}
          </Section>
        )}
        {pending.length > 0 && (
          <Section label="To do" count={pending.length}>
            {pending.map((o) => (
              <TaskRow key={o.task.id} occ={o} onToggle={() => toggle(o)} />
            ))}
          </Section>
        )}
        {finished.length > 0 && (
          <Section label="Done" count={finished.length}>
            {finished.map((o) => (
              <TaskRow key={o.task.id} occ={o} onToggle={() => toggle(o)} />
            ))}
          </Section>
        )}
      </div>

      <QuickAdd today={today} />
    </div>
  )
}
