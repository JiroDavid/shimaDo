import { useEffect, useState } from 'react'
import type { Accent, AppData } from '../../shared/types'

const ACCENTS: { id: Accent; color: string }[] = [
  { id: 'brick', color: '#B83A2D' },
  { id: 'sage', color: '#4E6851' },
  { id: 'cream', color: '#DCC9A9' }
]

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center justify-between border-b border-dark-border py-2">
      <span>{label}</span>
      <span className={`flex h-4 w-4 items-center justify-center border text-[10px] leading-none ${on ? 'border-sage bg-sage text-dark' : 'border-muted'}`}>{on ? '✓' : ''}</span>
    </button>
  )
}

export function Settings({ data }: { data: AppData }) {
  const s = data.settings
  const [opacity, setOpacity] = useState(s.opacity)

  useEffect(() => setOpacity(s.opacity), [s.opacity])
  useEffect(() => {
    if (opacity === s.opacity) return
    const t = setTimeout(() => window.shima.setSettings({ opacity }), 150)
    return () => clearTimeout(t)
  }, [opacity, s.opacity])

  return (
    <div className="space-y-4">
      <div>
        <div className="panel-label mb-1">opacity - {Math.round(opacity * 100)}%</div>
        <input
          type="range"
          min="0.3"
          max="1"
          step="0.05"
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: 'var(--accent)' }}
        />
      </div>
      <div>
        <div className="panel-label mb-1">accent</div>
        <div className="flex gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              aria-label={a.id}
              aria-pressed={s.accent === a.id}
              onClick={() => window.shima.setSettings({ accent: a.id })}
              className={`h-6 w-6 border ${s.accent === a.id ? 'border-cream' : 'border-dark-border'}`}
              style={{ background: a.color }}
            />
          ))}
        </div>
      </div>
      <div>
        <Toggle label="Always on top" on={s.alwaysOnTop} onChange={(v) => window.shima.setSettings({ alwaysOnTop: v })} />
        <Toggle label="Launch at startup" on={s.launchAtStartup} onChange={(v) => window.shima.setSettings({ launchAtStartup: v })} />
      </div>
    </div>
  )
}
