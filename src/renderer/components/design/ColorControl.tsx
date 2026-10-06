import { COLOR_INPUT_FALLBACK } from '../../../shared/design'

interface Props {
  label: string
  value: string | null
  palette: string[]
  onPick: (hex: string) => void
  onClear: () => void
}

export function ColorControl({ label, value, palette, onPick, onClear }: Props) {
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
          <input type="color" aria-label={`${label} custom`} value={value ?? COLOR_INPUT_FALLBACK} onChange={(e) => onPick(e.target.value)} />
        </label>
      </div>
    </div>
  )
}
