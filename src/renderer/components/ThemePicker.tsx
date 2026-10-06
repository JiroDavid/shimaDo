import type { Settings } from '../../shared/types'
import { THEMES } from '../../shared/themes'
import { ThemeCard } from './ThemeCard'

export function ThemePicker({ settings }: { settings: Settings }) {
  return (
    <div className="grid grid-cols-2 gap-2 pb-1" role="radiogroup" aria-label="Theme">
      {THEMES.map((theme) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          accent={settings.accent}
          selected={settings.theme === theme.id}
          onSelect={() => window.shima.setSettings({ theme: theme.id })}
        />
      ))}
    </div>
  )
}
