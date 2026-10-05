import { useState } from 'react'
import type { AppData, GymSet } from '../../../shared/types'
import { addDays, formatDay, fromDateKey, toDateKey, weekDays } from '../../../shared/dates'
import { dayPlan, templateFor, validateSet } from '../../../shared/gym'
import { useToday } from '../../hooks/useData'

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function SetAdder({ date, exercise }: { date: string; exercise: string }) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [error, setError] = useState<string | null>(null)

  const add = async () => {
    const input = { date, exercise, weightKg: Number(weight), reps: Number(reps) }
    const problem = validateSet(input, toDateKey(new Date()))
    if (problem) {
      setError(problem)
      return
    }
    await window.shima.addGymSet(input)
    setError(null)
    setReps('')
  }

  return (
    <div className="mt-1">
      <div className="flex gap-1">
        <input className="field" type="number" step="0.5" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
        <input
          className="field"
          type="number"
          placeholder="reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn" onClick={add} aria-label={`add set for ${exercise}`}>
          +
        </button>
      </div>
      {error && <p className="mt-1 text-brick">{error}</p>}
    </div>
  )
}

function SetList({ sets }: { sets: GymSet[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {sets.map((s) => (
        <span key={s.id} className="flex items-center gap-1 border border-dark-border px-1.5 py-0.5 text-[11px]">
          {s.weightKg}kg x {s.reps}
          <button className="text-muted hover:text-brick" aria-label="delete set" onClick={() => window.shima.deleteGymSet(s.id)}>
            x
          </button>
        </span>
      ))}
    </div>
  )
}

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
  const daySets = gym.sets.filter((s) => s.date === day)

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
            const p = dayPlan(gym, k)
            const marker = gym.done[k] ? 'bg-sage' : p ? 'bg-accent' : 'bg-transparent'
            return (
              <button
                key={k}
                onClick={() => setSelected(k)}
                className={`flex-1 border py-1 text-center ${k === day ? 'border-accent text-accent' : 'border-dark-border'} ${k === today ? 'font-bold' : ''}`}
              >
                <div className="text-[9px] text-muted">{LETTERS[fromDateKey(k).getDay()]}</div>
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
          <div className="text-[10px] text-muted">{formatDay(day)}</div>
          <div className="text-accent font-bold">{plan ? plan.label : 'rest day'}</div>
        </div>
        <button
          role="checkbox"
          aria-checked={done}
          onClick={() => window.shima.setGymDone(day, !done)}
          className={`flex h-5 w-5 items-center justify-center border text-[11px] leading-none ${done ? 'border-sage bg-sage text-dark' : 'border-muted'}`}
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
        <div key={exercise} className="border-b border-dark-border pb-2">
          <div className="mb-1">{exercise}</div>
          <SetList sets={daySets.filter((s) => s.exercise.toLowerCase() === exercise.toLowerCase())} />
          <SetAdder date={day} exercise={exercise} />
        </div>
      ))}
    </div>
  )
}
