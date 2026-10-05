import type { AppData } from '../../shared/types'
import { fromDateKey, weekDays } from '../../shared/dates'
import { nicotineStreak, nicotineWeeks } from '../../shared/stats'
import { BarChart } from '../components/BarChart'
import { Section } from '../components/Section'
import { Check } from '../components/TaskRow'
import { useToday } from '../hooks/useData'

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function Nicotine({ data }: { data: AppData }) {
  const today = useToday()
  const days = weekDays(today)
  const weeks = nicotineWeeks(data.nicotine, today, 8)
  const thisWeek = days.filter((k) => data.nicotine[k]).length

  return (
    <div className="space-y-2 pb-2">
      <div className="flex items-end justify-between gap-3 pt-2">
        <div>
          <div className="panel-label">Clean streak</div>
          <div className="heading text-[3.2rem] text-accent">{nicotineStreak(data.nicotine, today)} days</div>
        </div>
        <div className="pb-1 text-right">
          <div className="panel-label">This week</div>
          <div className="heading text-[1.8rem]">{thisWeek}/7</div>
        </div>
      </div>

      <Section label="Tick off each day">
        <div className="flex gap-1.5 pb-1">
          {days.map((k) => {
            const on = Boolean(data.nicotine[k])
            const isToday = k === today
            return (
              <div
                key={k}
                className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 py-2.5 transition ${
                  isToday ? 'border-accent bg-white/5' : 'border-transparent'
                }`}
              >
                <span className={`text-[0.8rem] font-extrabold ${isToday ? 'text-accent' : 'text-muted'}`}>{LETTERS[fromDateKey(k).getDay()]}</span>
                <Check checked={on} onChange={() => window.shima.setNicotine(k, !on)} label={`${k} nicotine free`} />
                <span className={`text-[0.75rem] font-bold ${isToday ? 'text-accent' : 'text-muted'}`}>{k.slice(8).replace(/^0/, '')}</span>
              </div>
            )
          })}
        </div>
      </Section>

      <Section label="Clean days per week">
        <BarChart values={weeks.map((w) => w.count)} labels={weeks.map((w) => w.weekStart.slice(5))} max={7} />
      </Section>
    </div>
  )
}
