import { useState } from 'react'
import type { AppData, Occurrence, Task } from '../../shared/types'
import { addDays, formatDay, fromDateKey, weekDays } from '../../shared/dates'
import { occurrencesOn } from '../../shared/recurrence'
import { TaskForm } from '../components/TaskForm'
import { TaskRow } from '../components/TaskRow'
import { useToday } from '../hooks/useData'

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function Schedule({ data }: { data: AppData }) {
  const today = useToday()
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)

  const day = selected ?? today
  const days = weekDays(addDays(today, offset * 7))
  const occurrences = occurrencesOn(data, day)

  const remove = (task: Task) => {
    if (window.confirm(`Delete "${task.title}"? Past progress is kept.`)) window.shima.deleteTask(task.id)
  }

  const actions = (o: Occurrence) => (
    <div className="flex shrink-0 gap-1">
      <button className="btn px-1.5" onClick={() => setEditing(o.task)}>
        edit
      </button>
      <button className="btn px-1.5" onClick={() => remove(o.task)}>
        del
      </button>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <button className="btn" onClick={() => setOffset(offset - 1)}>
          &lt;
        </button>
        <div className="flex flex-1 gap-1">
          {days.map((k) => {
            const has = occurrencesOn(data, k).length > 0
            const active = k === day
            return (
              <button
                key={k}
                onClick={() => setSelected(k)}
                className={`flex-1 border py-1 text-center ${active ? 'border-accent text-accent' : 'border-dark-border'} ${
                  k === today ? 'font-bold' : ''
                }`}
              >
                <div className="text-[0.7rem] text-muted">{LETTERS[fromDateKey(k).getDay()]}</div>
                <div>{k.slice(8)}</div>
                <div className={`mx-auto mt-0.5 h-1 w-1 rounded-full ${has ? 'bg-accent' : 'bg-transparent'}`} />
              </button>
            )
          })}
        </div>
        <button className="btn" onClick={() => setOffset(offset + 1)}>
          &gt;
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-accent font-bold">{formatDay(day)}</span>
        <button className="btn" onClick={() => setEditing('new')}>
          + task
        </button>
      </div>

      {editing && (
        <TaskForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          defaultDate={day}
          onCancel={() => setEditing(null)}
          onSubmit={(input) => {
            if (editing === 'new') window.shima.addTask(input)
            else window.shima.updateTask(editing.id, input)
            setEditing(null)
          }}
        />
      )}

      <div>
        {occurrences.length === 0 && <p className="py-4 text-center text-muted">nothing on this day</p>}
        {occurrences.map((o) => (
          <TaskRow key={o.task.id} occ={o} onToggle={() => window.shima.setDone(o.task.id, o.date, !o.done)} actions={actions(o)} />
        ))}
      </div>
    </div>
  )
}
