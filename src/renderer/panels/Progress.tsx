import type { AppData } from '../../shared/types'
import { daysBack, weekDays, weekdayOf } from '../../shared/dates'
import { consistency, doneCountByDay, taskStreak } from '../../shared/stats'
import { BarChart } from '../components/BarChart'
import { LineChart } from '../components/LineChart'
import { Section } from '../components/Section'
import { useToday } from '../hooks/useData'

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function Progress({ data }: { data: AppData }) {
  const today = useToday()
  const last30 = daysBack(today, 30)
  const last7 = daysBack(today, 7)
  const line = consistency(data, last30).map((v) => (v === null ? null : Math.round(v * 100)))
  const bars = doneCountByDay(data, last7)
  const weekTotal = doneCountByDay(data, weekDays(today)).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-2 pb-2">
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-2">
        <div>
          <div className="panel-label">Streak</div>
          <div className="heading text-[2.5rem] text-accent" data-el="progress.streak">{taskStreak(data, today)} days</div>
        </div>
        <div className="pb-1 text-right">
          <div className="panel-label">Done this week</div>
          <div className="heading text-[1.6rem]">{weekTotal}</div>
        </div>
      </div>
      <Section label="Consistency" count="30 days">
        <LineChart values={line} />
      </Section>
      <Section label="Tasks done" count="7 days">
        <BarChart values={bars} labels={last7.map((k) => LETTERS[weekdayOf(k)])} />
      </Section>
    </div>
  )
}
