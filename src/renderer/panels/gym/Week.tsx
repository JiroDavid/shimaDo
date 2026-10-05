import { useState } from 'react'
import type { AppData } from '../../../shared/types'
import { addDays, formatDay, fromDateKey, weekDays } from '../../../shared/dates'
import { dayPlan, templateFor } from '../../../shared/gym'
import { useToday } from '../../hooks/useData'

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function Week({ data }: { data: AppData }) {
  const today = useToday()
  const gym = data.gym
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  const day = selected ?? today
  const days = weekDays(addDays(today, offset * 7))
  const plan = dayPlan(gym, day)
  const overridden = Object.hasOwn(gym.overrides, day)
  const template = templateFor(gym, day)
  const swaps = template.flatMap((d, i) => (d === null ? [] : [{ index: i, label: d.label }]))
  const done = Boolean(gym.done[day])

  const swap = (value: string) => {
    if (value === 'rest') window.shima.setGymOverride(day, null)
    else if (value !== '') window.shima.setGymOverride(day, template[Number(value)])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <button className="btn" onClick={() => setOffset(offset - 1)}>
          &lt;
        </button>
        <div className="flex flex-1 gap-1">
          {days.map((k) => {
            const marker = gym.done[k] ? 'bg-sage' : dayPlan(gym, k) ? 'bg-accent' : 'bg-transparent'
            return (
              <button
                key={k}
                onClick={() => setSelected(k)}
                className={`flex-1 border py-1 text-center ${k === day ? 'border-accent text-accent' : 'border-dark-border'} ${k === today ? 'font-bold' : ''}`}
              >
                <div className="text-[0.7rem] text-muted">{LETTERS[fromDateKey(k).getDay()]}</div>
                <div>{k.slice(8)}</div>
                <div className={`mx-auto mt-0.5 h-1 w-1 rounded-full ${marker}`} />
              </button>
            )
          })}
        </div>
        <button className="btn" onClick={() => setOffset(offset + 1)}>
          &gt;
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-[0.75rem] text-muted">{formatDay(day)}</div>
          <div className="text-accent font-bold">{plan ? plan.label : 'rest day'}</div>
        </div>
        <button
          role="checkbox"
          aria-checked={done}
          onClick={() => window.shima.setGymDone(day, !done)}
          className={`flex h-5 w-5 items-center justify-center border text-[0.8rem] leading-none ${done ? 'border-sage bg-sage text-dark' : 'border-muted'}`}
        >
          {done ? '✓' : ''}
        </button>
      </div>

      <div className="flex gap-1">
        <select className="field" value="" onChange={(e) => swap(e.target.value)}>
          <option value="">change this day...</option>
          <option value="rest">rest day</option>
          {swaps.map((s) => (
            <option key={s.index} value={s.index}>
              do {s.label}
            </option>
          ))}
        </select>
        {overridden && (
          <button className="btn shrink-0" onClick={() => window.shima.setGymOverride(day, undefined)}>
            back to plan
          </button>
        )}
      </div>

      {plan && plan.exercises.length === 0 && <p className="text-muted">no exercises listed - add them in the split tab</p>}
      {plan?.exercises.map((exercise) => (
        <div key={exercise} className="border-b border-dark-border py-1">
          {exercise}
        </div>
      ))}
    </div>
  )
}
