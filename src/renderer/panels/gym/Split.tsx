import { useState } from 'react'
import type { AppData } from '../../../shared/types'
import { toDateKey } from '../../../shared/dates'
import { normalizeDays, templateFor, validateGymDays } from '../../../shared/gym'

const ORDER = [1, 2, 3, 4, 5, 6, 0]
const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function Split({ data, onSaved }: { data: AppData; onSaved: () => void }) {
  const current = templateFor(data.gym, toDateKey(new Date()))
  const [rows, setRows] = useState(() =>
    Array.from({ length: 7 }, (_, i) => ({ label: current[i]?.label ?? '', exercises: (current[i]?.exercises ?? []).join('\n') }))
  )
  const [error, setError] = useState<string | null>(null)

  const update = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)))

  const save = async () => {
    const days = normalizeDays(rows.map((r) => ({ label: r.label, exercises: r.exercises.split('\n') })))
    const problem = validateGymDays(days)
    if (problem) {
      setError(problem)
      return
    }
    await window.shima.setSplit(days)
    setError(null)
    onSaved()
  }

  return (
    <div className="space-y-2">
      <p className="text-muted">Leave a day empty for rest. Changes apply from today; earlier days keep their old plan.</p>
      {ORDER.map((i) => (
        <div key={i} className="card space-y-2">
          <div className="card-label">{NAMES[i]}</div>
          <input className="field" placeholder="Rest day" maxLength={24} value={rows[i].label} onChange={(e) => update(i, { label: e.target.value })} />
          <textarea className="field" rows={3} placeholder="Exercises, one per line" value={rows[i].exercises} onChange={(e) => update(i, { exercises: e.target.value })} />
        </div>
      ))}
      {error && <p className="font-bold text-urgent">{error}</p>}
      <div className="flex justify-end pt-2">
        <button className="btn btn-primary" onClick={save}>
          Save from today
        </button>
      </div>
    </div>
  )
}
