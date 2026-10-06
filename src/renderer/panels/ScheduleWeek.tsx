import { useEffect, useRef } from 'react'
import type { AppData, Task, TaskTag } from '../../shared/types'
import { formatDay, fromDateKey } from '../../shared/dates'
import { occurrencesOn } from '../../shared/recurrence'
import { layoutDay, type Block } from '../../shared/weekLayout'
import { TAG_COLOR } from '../components/TaskRow'
import { useNow } from '../hooks/useData'

const LETTERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOUR_PX = 48
const GRID_PX = 24 * HOUR_PX
const VIEW_PX = 420
const MIN_LANE_WIDTH = 62
const PANEL_BG = 'var(--panel-solid)'
const HOURS = Array.from({ length: 24 }, (_, h) => h)

const colorOf = (tag?: TaskTag) => (tag ? TAG_COLOR[tag] : 'var(--accent)')

interface Props {
  data: AppData
  days: string[]
  today: string
  onOpenDay?: (date: string) => void
  onHoverDay?: (date: string | null) => void
  onEdit: (task: Task) => void
  onCreate: (date: string, time: string) => void
}

function BlockView({ b, cascade, onEdit }: { b: Block; cascade: boolean; onEdit: (task: Task) => void }) {
  const { task } = b.occ
  const color = colorOf(task.tag)
  const height = ((b.end - b.start) / 60) * HOUR_PX - 2
  const width = b.lanes === 1 ? 100 : cascade ? Math.max(100 / b.lanes, MIN_LANE_WIDTH) : 100 / b.lanes
  const left = b.lanes === 1 ? 0 : cascade ? (b.lane * (100 - width)) / (b.lanes - 1) : b.lane * width
  return (
    <button
      onClick={(e) => (e.stopPropagation(), onEdit(task))}
      title={`${task.title} ${task.time}${task.endTime ? `-${task.endTime}` : ''}`}
      className="absolute flex flex-col items-stretch justify-start overflow-hidden rounded-lg px-1.5 py-0.5 text-left transition hover:brightness-125"
      style={{
        top: (b.start / 60) * HOUR_PX + 1,
        height,
        left: `calc(${left}% + 1px)`,
        width: `calc(${width}% - 2px)`,
        zIndex: b.lane + 1,
        background: `color-mix(in srgb, ${color} ${b.occ.done ? 14 : 38}%, ${PANEL_BG})`,
        borderLeft: `3px solid ${color}`,
        boxShadow: b.lanes > 1 ? `0 0 0 1px ${PANEL_BG}` : undefined,
        opacity: b.occ.done ? 0.6 : 1
      }}
    >
      <span className={`block truncate text-[0.74rem] font-extrabold leading-tight ${b.occ.done ? 'line-through' : ''}`}>{task.title}</span>
      {height >= 34 && (
        <span className="block truncate text-[0.66rem] font-bold leading-tight opacity-75">
          {task.time}
          {task.endTime ? `-${task.endTime}` : ''}
        </span>
      )}
    </button>
  )
}

export function ScheduleWeek({ data, days, today, onOpenDay, onHoverDay, onEdit, onCreate }: Props) {
  const now = useNow(30_000)
  const scroller = useRef<HTMLDivElement>(null)
  const nowDate = new Date(now)
  const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes()
  const columns = days.map((k) => ({ key: k, ...layoutDay(occurrencesOn(data, k)) }))
  const hasUntimed = columns.some((c) => c.untimed.length > 0)
  const showsToday = days.includes(today)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const focusHour = showsToday ? Math.max(nowDate.getHours() - 1, 0) : 7
    el.scrollTop = focusHour * HOUR_PX
  }, [days[0]])

  const click = (e: React.MouseEvent<HTMLDivElement>, date: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const hour = Math.min(23, Math.max(0, Math.floor((e.clientY - rect.top) / (rect.height / 24))))
    onCreate(date, `${String(hour).padStart(2, '0')}:00`)
  }

  return (
    <div className="card !mt-3 !p-2">
      {days.length > 1 && (
        <div className="flex">
          <div className="w-11 shrink-0" />
          {columns.map((c) => {
            const isToday = c.key === today
            const label = (
              <>
                <span className="text-[0.68rem] font-extrabold text-muted">{LETTERS[fromDateKey(c.key).getDay()]}</span>
                <span className="text-[1.05rem] font-extrabold leading-tight">{c.key.slice(8).replace(/^0/, '')}</span>
              </>
            )
            if (!onOpenDay) {
              return (
                <div key={c.key} className={`flex flex-1 flex-col items-center rounded-xl border-2 py-1 ${isToday ? 'border-accent text-accent' : 'border-transparent'}`}>
                  {label}
                </div>
              )
            }
            return (
              <button
                key={c.key}
                onClick={() => onOpenDay(c.key)}
                onMouseEnter={() => onHoverDay?.(c.key)}
                onMouseLeave={() => onHoverDay?.(null)}
                onFocus={() => onHoverDay?.(c.key)}
                onBlur={() => onHoverDay?.(null)}
                title={`Open ${formatDay(c.key)}`}
                aria-label={`Open ${formatDay(c.key)}`}
                className={`flex flex-1 cursor-pointer flex-col items-center rounded-xl border-2 py-1 transition hover:border-accent hover:bg-accent/20 focus-visible:border-accent ${
                  isToday ? 'border-accent/60 text-accent' : 'border-transparent'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {hasUntimed && (
        <div className="mt-1 flex border-b border-[var(--line)] pb-1">
          <div className="flex w-11 shrink-0 items-center text-[0.62rem] font-extrabold uppercase text-muted">Any</div>
          {columns.map((c) => (
            <div key={c.key} className="flex min-w-0 flex-1 flex-col gap-0.5 px-px">
              {c.untimed.map((o) => (
                <button
                  key={o.task.id}
                  onClick={() => onEdit(o.task)}
                  title={o.task.title}
                  className={`truncate rounded-md px-1 py-px text-left text-[0.68rem] font-extrabold ${o.done ? 'line-through' : ''}`}
                  style={{
                    background: `color-mix(in srgb, ${colorOf(o.task.tag)} ${o.done ? 14 : 38}%, transparent)`,
                    opacity: o.done ? 0.55 : 1
                  }}
                >
                  {o.task.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div ref={scroller} className="relative mt-1 overflow-y-auto overflow-x-hidden" style={{ height: VIEW_PX }}>
        <div className="relative flex" style={{ height: GRID_PX }}>
          <div className="relative w-11 shrink-0">
            {HOURS.slice(1).map((h) => (
              <span key={h} className="absolute right-1.5 -translate-y-1/2 text-[0.64rem] font-bold text-muted" style={{ top: h * HOUR_PX }}>
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {columns.map((c) => (
            <div
              key={c.key}
              onClick={(e) => click(e, c.key)}
              aria-label={`${c.key} timeline`}
              className="relative flex-1 cursor-cell border-l border-[var(--line)]"
              style={{
                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_PX - 1}px, var(--line) ${HOUR_PX - 1}px, var(--line) ${HOUR_PX}px)`
              }}
            >
              {c.blocks.map((b) => (
                <BlockView key={`${b.occ.task.id}-${b.start}`} b={b} cascade={days.length > 1} onEdit={onEdit} />
              ))}
              {c.key === today && (
                <div className="pointer-events-none absolute left-0 right-0 z-10 h-0.5 bg-accent" style={{ top: (nowMin / 60) * HOUR_PX }}>
                  <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-accent" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
