import { Menu, Tray, nativeImage, type MenuItemConstructorOptions } from 'electron'
import type { Accent, PanelId, SettingsPatch } from '../shared/types'
import type { PanelManager } from './panels'
import type { Store } from './store'

const TRAY_PANELS: { id: PanelId; label: string }[] = [
  { id: 'checklist', label: 'Checklist' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'progress', label: 'Progress' },
  { id: 'nicotine', label: 'Nicotine' }
]
const OPACITIES = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4]
const ACCENTS: Accent[] = ['orange', 'brick', 'sage', 'cream']

interface Options {
  store: Store
  panels: PanelManager
  iconPath: string
  onSettings: (patch: SettingsPatch) => void
  onExit: () => void
}

export function createTray({ store, panels, iconPath, onSettings, onExit }: Options) {
  const tray = new Tray(nativeImage.createFromPath(iconPath))
  tray.setToolTip('ShimaDo')

  const build = () => {
    const s = store.data.settings
    const template: MenuItemConstructorOptions[] = [
      ...TRAY_PANELS.map(({ id, label }) => ({
        label,
        type: 'checkbox' as const,
        checked: s.panels[id].visible,
        click: () => panels.toggle(id)
      })),
      { type: 'separator' },
      { label: 'Always on top', type: 'checkbox', checked: s.alwaysOnTop, click: (i) => onSettings({ alwaysOnTop: i.checked }) },
      {
        label: 'Opacity',
        submenu: OPACITIES.map((o) => ({
          label: `${Math.round(o * 100)}%`,
          type: 'radio' as const,
          checked: Math.abs(s.opacity - o) < 0.001,
          click: () => onSettings({ opacity: o })
        }))
      },
      {
        label: 'Accent',
        submenu: ACCENTS.map((a) => ({
          label: a,
          type: 'radio' as const,
          checked: s.accent === a,
          click: () => onSettings({ accent: a })
        }))
      },
      { label: 'Launch at startup', type: 'checkbox', checked: s.launchAtStartup, click: (i) => onSettings({ launchAtStartup: i.checked }) },
      { type: 'separator' },
      { label: 'Exit ShimaDo', click: onExit }
    ]
    return Menu.buildFromTemplate(template)
  }

  const refresh = () => tray.setContextMenu(build())
  tray.on('click', () => panels.show('checklist'))
  refresh()
  return { refresh }
}
