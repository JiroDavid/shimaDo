import { useState } from 'react'
import { TAG_LABELS, type AppData, type Occurrence, type Task, type TaskTag } from '../../shared/types'
import { addDays, formatDay, fromDateKey, weekDays } from '../../shared/dates'
import { monthGrid, shiftMonth } from '../../shared/calendar'
import { occurrencesOn } from '../../shared/recurrence'
import { TaskForm } from '../components/TaskForm'
import { TAG_COLOR, TaskRow } from '../components/TaskRow'
import { useToday } from '../hooks/useData'

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const TAG_ORDER: TaskTag[] = ['urgent', 'must', 'important']

function topTag(occs: Occurrence[]): TaskTag | undefined {
  return TAG_ORDER.find((t) => occs.some((o) => o.task.tag === t && !o.done))
}

interface CellProps {
  date: string
  today: string
  selected: string
  occs: Occurrence[]
  dim?: boolean
  onPick: (d: string) => void
  tall?: boolean
}

function DayCell({ date, today, selected, occs, dim, onPick, tall }: CellProps) {
  const isSelected = date === selected
  const isToday = date === today
  const tag = topTag(occs)
  const allDone = occs.length > 0 && occs.every((o) => o.done)
  const dot = tag ? TAG_COLOR[tag] : allDone ? 'var(--text)' : occs.length > 0 ? 'var(--accent)' : 'transparent'
  return (
    <button
      onClick={() => onPick(date)}
      aria-label={formatDay(date)}
      className={`flex flex-1 flex-col items-center justify-center rounded-2xl border-2 transition active:scale-95 ${tall ? 'py-2' : 'py-1'} ${
        isSelected ? 'border-accent bg-accent text-[#1a1410]' : isToday ? 'border-accent text-accent' : 'border-transparent hover:bg-white/10'
      } ${dim && !isSelected ? 'opacity-35' : ''}`}
    >
      {tall && <span className={`text-[0.72rem] font-extrabold ${isSelected ? '' : 'text-muted'}`}>{LETTERS[fromDateKey(date).getDay()]}</span>}
      <span className="text-[1.15rem] font-extrabold leading-tight">{date.slice(8).replace(/^0/, '')}</span>
      <span className="mt-0.5 h-1.5 w-1.5 rounded-full" style={{ background: isSelected ? '#1a1410' : dot, opacity: dot === 'transparent' ? 0 : 1 }} />
    </button>
  )
}

export function Schedule({ data }: { data: AppData }) {
  const today = useToday()
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [month, setMonth] = useState<string | null>(null)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)

  const day = selected ?? today
  const shownMonth = month ?? day.slice(0, 7)
  const days = weekDays(addDays(today, offset * 7))
  const occurrences = occurrencesOn(data, day)
  const [year, monthIndex] = shownMonth.split('-').map(Number)

  const pick = (d: string) => {
    setSelected(d)
    setMonth(null)
    setOffset(Math.round((fromDateKey(weekDays(d)[0]).getTime() - fromDateKey(weekDays(today)[0]).getTime()) / (7 * 86400000)))
  }

  const remove = (task: Task) => {
    if (window.confirm(`Delete "${task.title}"? Past progress is kept.`)) window.shima.deleteTask(task.id)
  }

  const actions = (o: Occurrence) => (
    <div className="flex shrink-0 gap-1.5">
      <button className="btn !min-h-[32px] !px-3 !text-[0.85rem]" onClick={() => setEditing(o.task)}>
        Edit
      </button>
      <button className="btn !min-h-[32px] !px-3 !text-[0.85rem]" onClick={() => remove(o.task)}>
        Delete
      </button>
    </div>
  )

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between gap-2">
        <button className="flex items-center gap-2 text-left" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
          <span className="heading text-[2rem]">
            {MONTHS[monthIndex - 1]} {year}
          </span>
          <svg
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-accent transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <button className="btn" onClick={() => pick(today)}>
          Today
        </button>
      </div>

      {expanded ? (
        <div className="card !mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <button className="btn !px-3" onClick={() => setMonth(shiftMonth(shownMonth, -1))} aria-label="previous month">
              ‹
            </button>
            <span className="font-extrabold">
              {MONTHS[monthIndex - 1]} {year}
            </span>
            <button className="btn !px-3" onClick={() => setMonth(shiftMonth(shownMonth, 1))} aria-label="next month">
              ›
            </button>
          </div>
          <div className="flex">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => (
              <span key={i} className="flex-1 text-center text-[0.75rem] font-extrabold text-muted">
                {l}
              </span>
            ))}
          </div>
          {monthGrid(shownMonth).map((row) => (
            <div key={row[0]} className="flex gap-1">
              {row.map((k) => (
                <DayCell key={k} date={k} today={today} selected={day} occs={occurrencesOn(data, k)} dim={!k.startsWith(shownMonth)} onPick={pick} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <button className="btn !px-3" onClick={() => setOffset(offset - 1)} aria-label="previous week">
            ‹
          </button>
          <div className="flex flex-1 gap-1">
            {days.map((k) => (
              <DayCell key={k} date={k} today={today} selected={day} occs={occurrencesOn(data, k)} onPick={pick} tall />
            ))}
          </div>
          <button className="btn !px-3" onClick={() => setOffset(offset + 1)} aria-label="next week">
            ›
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <h2 className="heading text-[1.6rem]">{formatDay(day)}</h2>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          + Task
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
        {occurrences.length === 0 && <p className="py-6 text-center text-lg font-bold text-muted">Nothing on this day</p>}
        {occurrences.map((o) => (
          <TaskRow key={o.task.id} occ={o} onToggle={() => window.shima.setDone(o.task.id, o.date, !o.done)} actions={actions(o)} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 pb-1 text-[0.8rem] font-bold text-muted">
        {TAG_ORDER.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: TAG_COLOR[t] }} />
            {TAG_LABELS[t]}
          </span>
        ))}
      </div>
    </div>
  )
}
