interface Props {
  label: string
  value: number
  min: number
  max: number
  unit?: string
  onChange: (value: number) => void
}

export function SliderControl({ label, value, min, max, unit = 'px', onChange }: Props) {
  const clamped = Math.min(max, Math.max(min, value))
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-bold">{label}</span>
        <span className="font-extrabold text-accent">
          {clamped}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={clamped}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: 'var(--accent)' }}
      />
    </div>
  )
}
