import { useState } from 'react'
import type { AppData, Occurrence } from '../../shared/types'
import { dueMs, formatDay } from '../../shared/dates'
import { occurrencesOn, overdueOnce } from '../../shared/recurrence'
import { TaskRow } from '../components/TaskRow'
import { useNow, useToday } from '../hooks/useData'

export function Checklist({ data }: { data: AppData }) {
  const today = useToday()
  const now = useNow()
  const [title, setTitle] = useState('')

  const todays = occurrencesOn(data, today)
  const isLate = (o: Occurrence) => !o.done && o.task.time !== '' && dueMs(o.date, o.task.time) < now
  const late = [...overdueOnce(data, today), ...todays.filter(isLate)]
  const pending = todays.filter((o) => !o.done && !isLate(o))
  const finished = todays.filter((o) => o.done)

  const toggle = (o: Occurrence) => window.shima.setDone(o.task.id, o.date, !o.done)
  const add = () => {
    const t = title.trim()
    if (!t) return
    window.shima.addTask({ title: t, kind: 'once', date: today, time: '' })
    setTitle('')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-accent font-bold">{formatDay(today)}</span>
        <span className="text-[10px] text-muted">
          {finished.length}/{todays.length} done
        </span>
      </div>

      <div className="flex-1">
        {late.length + pending.length + finished.length === 0 && <p className="py-6 text-center text-muted">nothing scheduled today</p>}
        {late.length > 0 && <div className="panel-label mt-1">overdue</div>}
        {late.map((o) => (
          <TaskRow key={`${o.task.id}-${o.date}`} occ={o} overdue showDate={o.date !== today} onToggle={() => toggle(o)} />
        ))}
        {pending.length > 0 && <div className="panel-label mt-2">to do</div>}
        {pending.map((o) => (
          <TaskRow key={o.task.id} occ={o} onToggle={() => toggle(o)} />
        ))}
        {finished.length > 0 && <div className="panel-label mt-2">done</div>}
        {finished.map((o) => (
          <TaskRow key={o.task.id} occ={o} onToggle={() => toggle(o)} />
        ))}
      </div>

      <input
        className="field mt-2"
        placeholder="+ add a task for today, press enter"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
      />
    </div>
  )
}
