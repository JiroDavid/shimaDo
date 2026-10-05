import { useState } from 'react'
import type { AppData } from '../../../shared/types'
import { toDateKey } from '../../../shared/dates'
import { normalizeDays, templateFor, validateGymDays } from '../../../shared/gym'

const ORDER = [1, 2, 3, 4, 5, 6, 0]
const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
    <div className="space-y-3">
      <p className="text-[10px] text-muted">leave a label empty for a rest day. changes apply from today; earlier days keep their old plan.</p>
      {ORDER.map((i) => (
        <div key={i} className="border border-dark-border p-2">
          <div className="flex items-center gap-2">
            <span className="panel-label w-8">{NAMES[i]}</span>
            <input className="field" placeholder="rest" maxLength={24} value={rows[i].label} onChange={(e) => update(i, { label: e.target.value })} />
          </div>
          <textarea
            className="field mt-1"
            rows={2}
            placeholder="exercises, one per line"
            value={rows[i].exercises}
            onChange={(e) => update(i, { exercises: e.target.value })}
          />
        </div>
      ))}
      {error && <p className="text-brick">{error}</p>}
      <div className="flex justify-end">
        <button className="btn" onClick={save}>
          save from today
        </button>
      </div>
    </div>
  )
}
