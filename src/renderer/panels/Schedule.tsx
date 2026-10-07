import { useEffect, useState } from 'react'
import { TAG_LABELS, type AppData, type Occurrence, type Task, type TaskTag } from '../../shared/types'
import { addDays, formatDay, fromDateKey, weekDays } from '../../shared/dates'
import { monthGrid, shiftMonth } from '../../shared/calendar'
import { occurrencesOn } from '../../shared/recurrence'
import { ScheduleWeek } from './ScheduleWeek'
import { TaskForm } from '../components/TaskForm'
import { TAG_COLOR, TaskRow } from '../components/TaskRow'
import { useToday } from '../hooks/useData'

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEK_PANEL = { width: 720, height: 600 }
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
  month?: boolean
}

function DayCell({ date, today, selected, occs, dim, onPick, tall, month }: CellProps) {
  const isSelected = date === selected
  const isToday = date === today
  const tag = topTag(occs)
  const allDone = occs.length > 0 && occs.every((o) => o.done)
  const dot = tag ? TAG_COLOR[tag] : allDone ? 'var(--text)' : occs.length > 0 ? 'var(--accent)' : 'transparent'
  const tint = month && !isSelected && occs.length > 0 ? (tag ? TAG_COLOR[tag] : allDone ? 'var(--text)' : 'var(--accent)') : null
  const left = occs.filter((o) => !o.done).length
  return (
    <button
      onClick={() => onPick(date)}
      style={tint ? { background: `color-mix(in srgb, ${tint} ${allDone ? 14 : 32}%, transparent)` } : undefined}
      aria-label={formatDay(date)}
      className={`flex flex-1 flex-col items-center justify-center rounded-2xl border-2 transition active:scale-95 ${tall ? 'py-2' : 'py-1.5'} ${
        isSelected ? 'border-accent bg-accent text-on-accent' : isToday ? 'border-accent text-accent' : 'border-transparent hover:bg-overlay'
      } ${dim && !isSelected ? 'opacity-35' : ''}`}
    >
      {tall && <span className={`text-[0.72rem] font-extrabold ${isSelected ? '' : 'text-muted'}`}>{LETTERS[fromDateKey(date).getDay()]}</span>}
      <span className="text-[1.15rem] font-extrabold leading-tight">{date.slice(8).replace(/^0/, '')}</span>
      {month ? (
        <span className="text-[0.65rem] font-extrabold leading-none opacity-80">{occs.length === 0 ? '\u00a0' : allDone ? '✓' : left}</span>
      ) : (
        <span className="mt-0.5 h-1.5 w-1.5 rounded-full" style={{ background: isSelected ? 'var(--on-accent)' : dot, opacity: dot === 'transparent' ? 0 : 1 }} />
      )}
    </button>
  )
}

export function Schedule({ data }: { data: AppData }) {
  const today = useToday()
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState<'list' | 'week' | 'day'>('list')
  const [hoverDay, setHoverDay] = useState<string | null>(null)
  const [slotTime, setSlotTime] = useState<string | undefined>()
  const [month, setMonth] = useState<string | null>(null)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)

  useEffect(() => {
    if (view === 'week') window.shima.expandPanel('schedule', WEEK_PANEL.width, WEEK_PANEL.height)
    else window.shima.collapsePanel('schedule')
  }, [view])

  const day = selected ?? today
  const days = weekDays(addDays(today, offset * 7))
  const week = view === 'week'
  const dayView = view === 'day'
  const shownMonth = view === 'list' && expanded ? (month ?? day.slice(0, 7)) : dayView ? day.slice(0, 7) : days[3].slice(0, 7)
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
      <div className="space-y-4" data-el="schedule.calendar">
        <div className="flex items-center justify-between gap-2">
          <button className="flex items-center gap-2 text-left" onClick={() => view === 'list' && setExpanded((e) => !e)} aria-expanded={expanded} disabled={view !== 'list'}>
            <span className="heading text-[1.75rem]" data-el="schedule.month">
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
              className={`text-accent transition-transform duration-300 ${expanded ? 'rotate-180' : ''} ${view !== 'list' ? 'hidden' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <div className="flex gap-2">
            <button className={`btn ${week ? 'btn-active' : ''}`} onClick={() => setView(week ? 'list' : 'week')} aria-pressed={week}>
              Week
            </button>
            <button
              className={`btn ${dayView && day === today ? 'btn-active' : ''}`}
              onClick={() => {
                if (dayView && day === today) return setView('list')
                pick(today)
                setView('day')
              }}
              aria-pressed={dayView && day === today}
            >
              Today
            </button>
          </div>
        </div>

        {week ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <button className="btn !px-3" onClick={() => setOffset(offset - 1)} aria-label="previous week">
                ‹
              </button>
              <span className={`font-extrabold transition ${hoverDay ? 'text-accent' : ''}`}>
                {hoverDay ? `Open ${formatDay(hoverDay)}` : `${formatDay(days[0])} - ${formatDay(days[6])}`}
              </span>
              <button className="btn !px-3" onClick={() => setOffset(offset + 1)} aria-label="next week">
                ›
              </button>
            </div>
            <ScheduleWeek
              data={data}
              days={days}
              today={today}
              onOpenDay={(date) => {
                pick(date)
                setHoverDay(null)
                setView('day')
              }}
              onHoverDay={setHoverDay}
              onEdit={(task) => setEditing(task)}
              onCreate={(date, time) => {
                pick(date)
                setSlotTime(time)
                setEditing('new')
              }}
            />
          </>
        ) : dayView ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <button className="btn !px-3" onClick={() => pick(addDays(day, -1))} aria-label="previous day">
                ‹
              </button>
              <span className="font-extrabold">{formatDay(day)}</span>
              <button className="btn !px-3" onClick={() => pick(addDays(day, 1))} aria-label="next day">
                ›
              </button>
            </div>
            <ScheduleWeek
              data={data}
              days={[day]}
              today={today}
              onEdit={(task) => setEditing(task)}
              onCreate={(date, time) => {
                setSlotTime(time)
                setEditing('new')
              }}
            />
          </>
        ) : expanded ? (
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
                  <DayCell key={k} date={k} today={today} selected={day} occs={occurrencesOn(data, k)} dim={!k.startsWith(shownMonth)} onPick={pick} month />
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

      </div>

      <div className="space-y-4" data-el="schedule.day">
        <div className="flex items-center justify-between gap-2 pt-1">
          <h2 className="heading text-[1.4rem]">{formatDay(day)}</h2>
          <button
            className="btn btn-primary"
            data-el="schedule.add-task"
            onClick={() => {
              setSlotTime(undefined)
              setEditing('new')
            }}
          >
            + Task
          </button>
        </div>

        {editing && (
          <TaskForm
            key={editing === 'new' ? `new-${day}-${slotTime ?? ''}` : editing.id}
            initial={editing === 'new' ? undefined : editing}
            defaultDate={day}
            defaultTime={editing === 'new' ? slotTime : undefined}
            onCancel={() => setEditing(null)}
            onSubmit={(input) => {
              if (editing === 'new') window.shima.addTask(input)
              else window.shima.updateTask(editing.id, input)
              setEditing(null)
            }}
          />
        )}

        <div className={week ? 'hidden' : ''}>
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
    </div>
  )
}
