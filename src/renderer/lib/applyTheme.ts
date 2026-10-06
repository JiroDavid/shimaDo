import type { Settings } from '../../shared/types'
import { themeVars } from '../../shared/theme'
import { themeById } from '../../shared/themes'

export function applyTheme(settings: Pick<Settings, 'theme' | 'accent' | 'opacity'>, root: HTMLElement = document.documentElement): void {
  const theme = themeById(settings.theme)
  for (const [name, value] of Object.entries(themeVars(theme, settings.accent, settings.opacity))) root.style.setProperty(name, value)
  root.dataset.mode = theme.mode
}
