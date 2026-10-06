import { useState, type ReactNode } from 'react'
import type { AppData, Settings } from '../../shared/types'
import { AccentPicker } from '../components/AccentPicker'
import { ThemePicker } from '../components/ThemePicker'

const STEPS: { id: string; render: (s: Settings) => ReactNode }[] = [
  {
    id: 'look',
    render: (s) => (
      <div className="space-y-3">
        <div>
          <div className="heading text-[1.9rem]">Welcome to ShimaDo</div>
          <p className="mt-1 text-muted">Pick a look. You can change it any time in Settings.</p>
        </div>
        <ThemePicker settings={s} />
        <AccentPicker settings={s} />
      </div>
    )
  }
]

export function Welcome({ data }: { data: AppData }) {
  const [index, setIndex] = useState(0)
  const last = index === STEPS.length - 1
  return (
    <div className="space-y-3 pb-3 pt-2">
      {STEPS[index].render(data.settings)}
      <div className="flex justify-end pt-1">
        <button className="btn btn-primary" onClick={() => (last ? window.shima.hidePanel('welcome') : setIndex(index + 1))}>
          {last ? 'Start' : 'Next'}
        </button>
      </div>
    </div>
  )
}
