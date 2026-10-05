import { useEffect, useState } from 'react'
import type { Accent, AppData, DisplayInfo } from '../../shared/types'
import { Section } from '../components/Section'

const ACCENTS: { id: Accent; color: string }[] = [
  { id: 'orange', color: '#F2541B' },
  { id: 'brick', color: '#E5484D' },
  { id: 'sage', color: '#6E9A74' },
  { id: 'cream', color: '#E8D9BC' }
]

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dark-border py-3 last:border-b-0">
      <span className="font-bold">{label}</span>
      <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="switch" />
    </div>
  )
}

export function Settings({ data }: { data: AppData }) {
  const s = data.settings
  const [opacity, setOpacity] = useState(s.opacity)
  const [displays, setDisplays] = useState<DisplayInfo[]>([])

  useEffect(() => setOpacity(s.opacity), [s.opacity])
  useEffect(() => {
    if (opacity === s.opacity) return
    const t = setTimeout(() => window.shima.setSettings({ opacity }), 150)
    return () => clearTimeout(t)
  }, [opacity, s.opacity])
  useEffect(() => {
    window.shima.listDisplays().then(setDisplays)
  }, [data])

  const move = async (id: number) => {
    await window.shima.moveAllToDisplay(id)
    setDisplays(await window.shima.listDisplays())
  }

  return (
    <div className="space-y-2 pb-2">
      <Section label="Look">
        <div className="space-y-4 pb-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold">Panel opacity</span>
              <span className="font-extrabold text-accent">{Math.round(opacity * 100)}%</span>
            </div>
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
            <div className="mb-2 font-bold">Accent colour</div>
            <div className="flex gap-3">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  className="swatch"
                  aria-label={a.id}
                  aria-pressed={s.accent === a.id}
                  onClick={() => window.shima.setSettings({ accent: a.id })}
                  style={{ background: a.color }}
                />
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section label="Behaviour">
        <Toggle label="Always on top" on={s.alwaysOnTop} onChange={(v) => window.shima.setSettings({ alwaysOnTop: v })} />
        <Toggle label="Launch at startup" on={s.launchAtStartup} onChange={(v) => window.shima.setSettings({ launchAtStartup: v })} />
      </Section>

      <Section label="Monitors">
        <div className="space-y-2 pb-1">
          {displays.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-dark-border px-3 py-2.5">
              <div className="min-w-0">
                <div className="font-bold">{d.label}</div>
                <div className="text-[0.8rem] font-bold text-muted">
                  {d.primary ? 'Primary' : 'Secondary'}
                  {d.hasBar ? ' · panels are here' : ''}
                </div>
              </div>
              <button className={`btn shrink-0 !px-3 ${d.hasBar ? '!opacity-40' : ''}`} disabled={d.hasBar} onClick={() => move(d.id)}>
                Move here
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section label="Layout">
        <p className="mb-3 text-muted">Panels went missing or ended up in a strange spot? Put everything back on screen.</p>
        <button className="btn mb-1" onClick={() => window.shima.resetLayout()}>
          Reset layout
        </button>
      </Section>
    </div>
  )
}
