import { useEffect, useState } from 'react'
import type { AppData } from '../../shared/types'
import { MAX_TASK_LENGTH, PHASE_LABELS, PHASE_MS, SETS_BEFORE_LONG, formatClock, remaining } from '../../shared/pomodoro'
import { daysBack, fromDateKey, weekDays } from '../../shared/dates'
import { pomodoroStreak } from '../../shared/stats'
import { BarChart } from '../components/BarChart'
import { Section } from '../components/Section'
import { useNow, useTimer, useToday } from '../hooks/useData'

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function Focus({ data }: { data: AppData }) {
  const timer = useTimer()
  const now = useNow(250)
  const today = useToday()
  const [task, setTask] = useState('')
  useEffect(() => {
    if (timer) setTask(timer.task)
  }, [timer?.task])
  if (!timer) return null

  const left = remaining(timer, now)
  const progress = 1 - left / PHASE_MS[timer.phase]
  const isFocus = timer.phase === 'focus'
  const count = (k: string) => data.pomodoros[k] ?? 0
  const last7 = daysBack(today, 7)
  const weekTotal = weekDays(today).reduce((sum, k) => sum + count(k), 0)
  const act = window.shima.timerAction
  const commitTask = () => task.trim() !== timer.task && window.shima.setTimerTask(task)
  const todays = data.pomodoroLog.filter((s) => s.date === today)
  const byTask = [...todays.reduce((m, s) => m.set(s.task, (m.get(s.task) ?? 0) + 1), new Map<string, number>())]
  const recent = [...new Set(data.pomodoroLog.map((s) => s.task).filter(Boolean).reverse())].slice(0, 8)

  return (
    <div className="space-y-2 pb-2">
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-2">
        <div>
          <div className="panel-label">Today</div>
          <div className="heading text-[2.5rem] text-accent">{count(today)} 🍅</div>
        </div>
        <div className="pb-1 text-right">
          <div className="panel-label">This week</div>
          <div className="heading text-[1.6rem]">{weekTotal}</div>
        </div>
      </div>

      <Section label={PHASE_LABELS[timer.phase]} count={`${Math.min(timer.cycle + (isFocus ? 1 : 0), SETS_BEFORE_LONG)}/${SETS_BEFORE_LONG}`}>
        <div className="pb-1 text-center">
          <input
            className="mb-2 w-full rounded-2xl border-2 border-dark-border bg-transparent px-3 py-2 text-center font-bold outline-none focus:border-accent"
            placeholder="What are you working on?"
            aria-label="Task for this pomodoro"
            list="recent-tasks"
            maxLength={MAX_TASK_LENGTH}
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onBlur={commitTask}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
          <datalist id="recent-tasks">
            {recent.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <div className={`heading text-[3rem] ${isFocus ? 'text-accent' : ''}`}>{formatClock(left)}</div>
          <div className="mx-auto my-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-accent" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className="flex justify-center gap-2">
            <button className="btn btn-primary" onClick={() => (commitTask(), act(timer.running ? 'pause' : 'start'))}>
              {timer.running ? 'Pause' : 'Start'}
            </button>
            <button className="btn" onClick={() => act('reset')}>Reset</button>
            <button className="btn" onClick={() => act('skip')}>Skip</button>
          </div>
        </div>
      </Section>

      {byTask.length > 0 && (
        <Section label="Today by task" count={`${todays.length}`}>
          <div className="space-y-1 pb-1">
            {byTask.map(([name, n]) => (
              <div key={name} className="flex items-center justify-between gap-3">
                <span className={`min-w-0 truncate font-bold ${name ? '' : 'text-muted'}`}>{name || 'No task'}</span>
                <span className="shrink-0 font-extrabold text-accent">{'🍅'.repeat(Math.min(n, 8))}{n > 8 ? ` ${n}` : ''}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section label="Pomodoros per day" count={`${pomodoroStreak(data.pomodoros, today)} day streak`}>
        <BarChart values={last7.map(count)} labels={last7.map((k) => LETTERS[fromDateKey(k).getDay()])} />
      </Section>
    </div>
  )
}
