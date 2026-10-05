import type { AppData } from '../../shared/types'
import { PHASE_LABELS, PHASE_MS, SETS_BEFORE_LONG, formatClock, remaining } from '../../shared/pomodoro'
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
  if (!timer) return null

  const left = remaining(timer, now)
  const progress = 1 - left / PHASE_MS[timer.phase]
  const isFocus = timer.phase === 'focus'
  const count = (k: string) => data.pomodoros[k] ?? 0
  const last7 = daysBack(today, 7)
  const weekTotal = weekDays(today).reduce((sum, k) => sum + count(k), 0)
  const act = window.shima.timerAction

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
          <div className={`heading text-[3rem] ${isFocus ? 'text-accent' : ''}`}>{formatClock(left)}</div>
          <div className="mx-auto my-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-accent" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className="flex justify-center gap-2">
            <button className="btn btn-primary" onClick={() => act(timer.running ? 'pause' : 'start')}>
              {timer.running ? 'Pause' : 'Start'}
            </button>
            <button className="btn" onClick={() => act('reset')}>Reset</button>
            <button className="btn" onClick={() => act('skip')}>Skip</button>
          </div>
        </div>
      </Section>

      <Section label="Pomodoros per day" count={`${pomodoroStreak(data.pomodoros, today)} day streak`}>
        <BarChart values={last7.map(count)} labels={last7.map((k) => LETTERS[fromDateKey(k).getDay()])} />
      </Section>
    </div>
  )
}
