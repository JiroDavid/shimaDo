import type { AppData } from '../../shared/types'
import { fromDateKey, weekDays } from '../../shared/dates'
import { nicotineStreak, nicotineWeeks } from '../../shared/stats'
import { BarChart } from '../components/BarChart'
import { useToday } from '../hooks/useData'

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function Nicotine({ data }: { data: AppData }) {
  const today = useToday()
  const days = weekDays(today)
  const weeks = nicotineWeeks(data.nicotine, today, 8)
  const thisWeek = days.filter((k) => data.nicotine[k]).length

  return (
    <div className="space-y-4">
      <div className="border border-dark-border p-2">
        <div className="panel-label">clean streak</div>
        <div className="text-accent text-lg font-bold">{nicotineStreak(data.nicotine, today)}d</div>
      </div>

      <div>
        <div className="panel-label mb-1">this week - {thisWeek}/7</div>
        <div className="flex gap-1">
          {days.map((k) => {
            const future = k > today
            const on = Boolean(data.nicotine[k])
            return (
              <button
                key={k}
                disabled={future}
                aria-label={`${k} nicotine free`}
                aria-pressed={on}
                onClick={() => window.shima.setNicotine(k, !on)}
                className={`flex flex-1 flex-col items-center gap-1 border py-1 ${
                  k === today ? 'border-accent' : 'border-dark-border'
                } ${future ? 'opacity-30' : ''}`}
              >
                <span className="text-[0.7rem] text-muted">{LETTERS[fromDateKey(k).getDay()]}</span>
                <span className={`flex h-4 w-4 items-center justify-center border text-[0.75rem] leading-none ${on ? 'border-sage bg-sage text-dark' : 'border-muted'}`}>
                  {on ? '✓' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="panel-label mb-1">clean days per week</div>
        <BarChart values={weeks.map((w) => w.count)} labels={weeks.map((w) => w.weekStart.slice(5))} max={7} />
      </div>
    </div>
  )
}
