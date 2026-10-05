import { useState } from 'react'
import type { AppData } from '../../../shared/types'
import { daysBack, toDateKey } from '../../../shared/dates'
import { latestWeight, validateWeighIn, weeklyConsistency, weightTrend } from '../../../shared/gym'
import { BarChart } from '../../components/BarChart'
import { LineChart } from '../../components/LineChart'
import { useToday } from '../../hooks/useData'

function range(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 100 }
  return { min: Math.floor(Math.min(...values)) - 1, max: Math.ceil(Math.max(...values)) + 1 }
}

function WeighIn() {
  const [kg, setKg] = useState('')
  const [error, setError] = useState<string | null>(null)

  const log = async () => {
    const value = Number(kg)
    const problem = validateWeighIn(value)
    if (problem) {
      setError(problem)
      return
    }
    await window.shima.setWeighIn(toDateKey(new Date()), value)
    setKg('')
    setError(null)
  }

  return (
    <div>
      <div className="flex gap-1">
        <input
          className="field"
          type="number"
          step="0.1"
          placeholder="today's weight (kg)"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && log()}
        />
        <button className="btn shrink-0" onClick={log}>
          log
        </button>
      </div>
      {error && <p className="mt-1 text-brick">{error}</p>}
    </div>
  )
}

export function Charts({ data }: { data: AppData }) {
  const today = useToday()
  const gym = data.gym

  const weeks = weeklyConsistency(gym, today, 8)
  const rates = weeks.map((w) => (w.planned === 0 ? 0 : Math.round((w.done / w.planned) * 100)))

  const { raw, trend } = weightTrend(gym.weighIns, daysBack(today, 60))
  const weightRange = range([...raw, ...trend].filter((v): v is number => v !== null))
  const latest = latestWeight(gym.weighIns)

  return (
    <div className="space-y-5">
      <div>
        <div className="panel-label mb-1">consistency - done / planned per week</div>
        <BarChart values={rates} labels={weeks.map((w) => w.weekStart.slice(5))} max={100} />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="panel-label">weight - 60 days (line = 7-day average)</span>
          <span className="text-accent font-bold">{latest === null ? '--' : `${latest} kg`}</span>
        </div>
        <WeighIn />
        <LineChart values={trend} dots={raw} min={weightRange.min} max={weightRange.max} />
      </div>
    </div>
  )
}
