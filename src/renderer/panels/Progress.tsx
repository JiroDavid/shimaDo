import type { AppData } from '../../shared/types'
import { daysBack, weekDays, weekdayOf } from '../../shared/dates'
import { consistency, doneCountByDay, taskStreak } from '../../shared/stats'
import { BarChart } from '../components/BarChart'
import { LineChart } from '../components/LineChart'
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
    <div className="space-y-4">
      <div className="flex gap-2">
        <Stat label="streak" value={`${taskStreak(data, today)}d`} />
        <Stat label="this week" value={String(weekTotal)} />
      </div>
      <div>
        <div className="panel-label mb-1">consistency - 30 days</div>
        <LineChart values={line} />
      </div>
      <div>
        <div className="panel-label mb-1">tasks done - 7 days</div>
        <BarChart values={bars} labels={last7.map((k) => LETTERS[weekdayOf(k)])} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 border border-dark-border p-2">
      <div className="panel-label">{label}</div>
      <div className="text-accent text-lg font-bold">{value}</div>
    </div>
  )
}
