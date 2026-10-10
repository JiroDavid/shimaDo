import { useEffect, useState } from 'react'
import type { AppData, DisplayInfo } from '../../shared/types'
import { AccentPicker } from '../components/AccentPicker'
import { Section } from '../components/Section'
import { ThemePicker } from '../components/ThemePicker'

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
      <span className="font-bold">{label}</span>
      <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="switch" />
    </div>
  )
}

export function Settings({ data }: { data: AppData }) {
  const s = data.settings
  const [opacity, setOpacity] = useState(s.opacity)
  const [scale, setScale] = useState(s.textScale)
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [backupMsg, setBackupMsg] = useState('')
  const [version, setVersion] = useState('')
  const [updateMsg, setUpdateMsg] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => setOpacity(s.opacity), [s.opacity])
  useEffect(() => setScale(s.textScale), [s.textScale])
  useEffect(() => {
    if (opacity === s.opacity) return
    const t = setTimeout(() => window.shima.setSettings({ opacity }), 150)
    return () => clearTimeout(t)
  }, [opacity, s.opacity])
  useEffect(() => {
    window.shima.listDisplays().then(setDisplays)
  }, [data])

  useEffect(() => {
    window.shima.getVersion().then(setVersion)
  }, [])

  const checkUpdates = async () => {
    setChecking(true)
    setUpdateMsg('')
    const s = await window.shima.checkForUpdates()
    setChecking(false)
    if (s.kind === 'current') setUpdateMsg("You're up to date")
    else if (s.kind === 'error') setUpdateMsg(s.message)
  }

  const runBackup = async (action: () => Promise<{ message: string }>) => setBackupMsg((await action()).message)

  const move = async (id: number) => {
    await window.shima.moveAllToDisplay(id)
    setDisplays(await window.shima.listDisplays())
  }

  return (
    <div className="space-y-2 pb-2">
      <Section label="Theme">
        <ThemePicker settings={s} />
      </Section>

      <Section label="Look">
        <div className="space-y-4 pb-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold">Panel opacity</span>
              <span className="font-extrabold text-accent" data-el="settings.opacity-value">{Math.round(opacity * 100)}%</span>
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
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold">Text size</span>
              <span className="font-extrabold text-accent">{Math.round(scale * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.4"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              onPointerUp={() => scale !== s.textScale && window.shima.setSettings({ textScale: scale })}
              onKeyUp={() => scale !== s.textScale && window.shima.setSettings({ textScale: scale })}
              className="w-full"
              style={{ accentColor: 'var(--accent)' }}
            />
            <p className="mt-1 text-[0.8rem] text-muted">Everything resizes and re-wraps. Panels grow or shrink with it.</p>
          </div>
          <AccentPicker settings={s} />
        </div>
      </Section>

      <Section label="Behaviour">
        <Toggle label="Always on top" on={s.alwaysOnTop} onChange={(v) => window.shima.setSettings({ alwaysOnTop: v })} />
        <Toggle label="Launch at startup" on={s.launchAtStartup} onChange={(v) => window.shima.setSettings({ launchAtStartup: v })} />
      </Section>

      <Section label="Monitors">
        <div className="space-y-2 pb-1">
          {displays.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-line px-3 py-2.5">
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

      <Section label="Backup">
        <p className="mb-3 text-muted">Save everything (tasks, history, gym, profile, settings) to a file, or load one to replace what is here.</p>
        <div className="flex gap-2">
          <button className="btn" data-el="settings.export" onClick={() => runBackup(window.shima.exportBackup)}>
            Export
          </button>
          <button className="btn" data-el="settings.import" onClick={() => runBackup(window.shima.importBackup)}>
            Import
          </button>
        </div>
        {backupMsg && <p className="mt-2 text-[0.85rem] font-bold text-accent">{backupMsg}</p>}
      </Section>

      <Section label="Updates">
        <p className="mb-3 text-muted">ShimaDo {version}</p>
        <button className="btn" data-el="settings.check-updates" disabled={checking} onClick={checkUpdates}>
          {checking ? 'Checking...' : 'Check for updates'}
        </button>
        {updateMsg && <p className="mt-2 text-[0.85rem] font-bold text-accent">{updateMsg}</p>}
      </Section>

      <Section label="Layout">
        <p className="mb-3 text-muted">Panels went missing or ended up in a strange spot? Put everything back on screen.</p>
        <button className="btn mb-1" data-el="settings.reset-layout" onClick={() => window.shima.resetLayout()}>
          Reset layout
        </button>
      </Section>
    </div>
  )
}
