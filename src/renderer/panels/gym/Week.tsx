import { useState } from 'react'
import type { AppData } from '../../../shared/types'
import { addDays, formatDay, fromDateKey, weekDays } from '../../../shared/dates'
import { dayPlan, templateFor } from '../../../shared/gym'
import { Check } from '../../components/TaskRow'
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

  const change = (value: string) => {
    if (value === 'rest') window.shima.setGymOverride(day, null)
    else if (value !== '') window.shima.setGymOverride(day, template[Number(value)])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        <button className="btn !px-3" onClick={() => setOffset(offset - 1)} aria-label="previous week">
          ‹
        </button>
        <div className="flex flex-1 gap-1">
          {days.map((k) => {
            const p = dayPlan(gym, k)
            const isSelected = k === day
            const isToday = k === today
            return (
              <button
                key={k}
                onClick={() => setSelected(k)}
                aria-label={formatDay(k)}
                className={`flex flex-1 flex-col items-center rounded-2xl border-2 py-2 transition active:scale-95 ${
                  isSelected ? 'border-accent bg-accent text-[#1a1410]' : isToday ? 'border-accent text-accent' : 'border-transparent hover:bg-white/10'
                }`}
              >
                <span className={`text-[0.72rem] font-extrabold ${isSelected ? '' : 'text-muted'}`}>{LETTERS[fromDateKey(k).getDay()]}</span>
                <span className="text-[1.15rem] font-extrabold leading-tight">{k.slice(8).replace(/^0/, '')}</span>
                <span className="mt-0.5 text-[0.8rem] font-extrabold leading-none">{gym.done[k] ? '✓' : p ? '•' : ''}</span>
              </button>
            )
          })}
        </div>
        <button className="btn !px-3" onClick={() => setOffset(offset + 1)} aria-label="next week">
          ›
        </button>
      </div>

      <div className="card space-y-3">
        <div className="card-label">{formatDay(day)}</div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="heading text-[2.2rem]">{plan ? plan.label : 'Rest day'}</h2>
          <div className="flex items-center gap-2.5">
            <span className={`font-extrabold ${done ? 'text-accent' : 'text-muted'}`}>{done ? 'Done' : 'Not yet'}</span>
            <Check checked={done} onChange={() => window.shima.setGymDone(day, !done)} label="mark day done" />
          </div>
        </div>

        {plan && plan.exercises.length === 0 && <p className="text-muted">No exercises listed. Add them in My split.</p>}
        {plan?.exercises.map((exercise, i) => (
          <div key={`${exercise}-${i}`} className="flex items-center gap-3 border-t border-dark-border py-2.5">
            <span className="heading w-6 text-[1.3rem] text-accent">{i + 1}</span>
            <span className="text-[1.05rem] font-bold">{exercise}</span>
          </div>
        ))}

        <div className="flex gap-2 border-t border-dark-border pt-3">
          <select className="field" value="" onChange={(e) => change(e.target.value)}>
            <option value="">Did something else today?</option>
            <option value="rest">Rest day</option>
            {swaps.map((s) => (
              <option key={s.index} value={s.index}>
                I did {s.label}
              </option>
            ))}
          </select>
          {overridden && (
            <button className="btn shrink-0" onClick={() => window.shima.setGymOverride(day, undefined)}>
              Back to plan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
