import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../../shared/types'
import { ACCENT_SLOTS, FALLBACK_CUSTOM_ACCENT, isLowContrast, normaliseAccentInput } from '../../shared/theme'
import { themeById } from '../../shared/themes'

const COMMIT_DELAY_MS = 150

export function AccentPicker({ settings }: { settings: Settings }) {
  const theme = themeById(settings.theme)
  const custom = settings.accent.startsWith('#')
  const [hex, setHex] = useState(custom ? settings.accent : FALLBACK_CUSTOM_ACCENT)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (settings.accent.startsWith('#')) setHex(settings.accent)
  }, [settings.accent])

  const commit = (value: string) => {
    const normal = normaliseAccentInput(value)
    if (normal?.startsWith('#')) window.shima.setSettings({ accent: normal })
  }

  const pick = (value: string) => {
    setHex(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => commit(value), COMMIT_DELAY_MS)
  }

  return (
    <div>
      <div className="mb-2 font-bold">Accent colour</div>
      <div className="flex flex-wrap items-center gap-3">
        {ACCENT_SLOTS.map((slot) => (
          <button
            key={slot}
            className="swatch"
            aria-label={theme.accents[slot].name}
            title={theme.accents[slot].name}
            aria-pressed={settings.accent === slot}
            onClick={() => window.shima.setSettings({ accent: slot })}
            style={{ background: theme.accents[slot].value }}
          />
        ))}
        <label className="swatch swatch-custom" title="Custom colour" data-selected={custom} style={custom ? { background: settings.accent } : undefined}>
          <input type="color" aria-label="Custom colour" value={normaliseAccentInput(hex) ?? FALLBACK_CUSTOM_ACCENT} onChange={(e) => pick(e.target.value)} />
        </label>
        <input
          className="field !min-h-[34px] !w-28 !px-3 text-[0.85rem]"
          aria-label="Custom colour hex"
          value={hex}
          maxLength={7}
          onChange={(e) => setHex(e.target.value)}
          onBlur={() => commit(hex)}
          onKeyDown={(e) => e.key === 'Enter' && commit(hex)}
        />
      </div>
      {isLowContrast(theme, settings.accent) && <p className="mt-2 text-[0.8rem] font-bold text-muted">Low contrast on this theme. It may be hard to read.</p>}
    </div>
  )
}
