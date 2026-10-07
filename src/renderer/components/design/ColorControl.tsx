import { useEffect, useRef } from 'react'
import { COLOR_INPUT_FALLBACK } from '../../../shared/design'

interface Props {
  label: string
  value: string | null
  palette: string[]
  recent?: string[]
  onPick: (hex: string) => void
  onClear: () => void
}

const SETTLE_MS = 700

export function ColorControl({ label, value, palette, recent = [], onPick, onClear }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const custom = (hex: string) => {
    onPick(hex)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (!palette.some((p) => p.toLowerCase() === hex.toLowerCase())) window.shima.editRecentColor(hex)
    }, SETTLE_MS)
  }

  const shown = recent.filter((c) => !palette.some((p) => p.toLowerCase() === c.toLowerCase()))

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-bold">{label}</span>
        <button className="btn !min-h-[26px] !px-2.5 !text-[0.78rem]" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {palette.map((hex) => (
          <button key={hex} className="swatch-sm" aria-label={`${label} ${hex}`} title={hex} onClick={() => onPick(hex)} style={{ background: hex }} />
        ))}
        <label className="swatch-sm swatch-custom" title="Custom colour" style={value ? { background: value } : undefined}>
          <input type="color" aria-label={`${label} custom`} value={value ?? COLOR_INPUT_FALLBACK} onChange={(e) => custom(e.target.value)} />
        </label>
      </div>
      {shown.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label={`${label} recent colours`}>
          <span className="text-[0.72rem] font-bold uppercase tracking-wider text-muted">Recent</span>
          {shown.map((hex) => (
            <button key={hex} className="swatch-sm" aria-label={`${label} recent ${hex}`} title={hex} onClick={() => onPick(hex)} style={{ background: hex }} />
          ))}
        </div>
      )}
    </div>
  )
}
