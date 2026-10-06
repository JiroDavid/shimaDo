import { Menu, Tray, nativeImage, type MenuItemConstructorOptions } from 'electron'
import type { PanelId, SettingsPatch } from '../shared/types'
import type { PanelManager } from './panels'
import type { Store } from './store'
import { accentChoices } from '../shared/theme'
import { themeById } from '../shared/themes'

const TRAY_PANELS: { id: PanelId; label: string }[] = [
  { id: 'checklist', label: 'Checklist' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'progress', label: 'Progress' },
  { id: 'habits', label: 'Habits' },
  { id: 'focus', label: 'Focus' },
  { id: 'notepad', label: 'Notepad' }
]
const OPACITIES = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4]

interface Options {
  store: Store
  panels: PanelManager
  iconPath: string
  onSettings: (patch: SettingsPatch) => void
  onExit: () => void
  isEditing: () => boolean
  onEdit: (on: boolean) => void
}

export function createTray({ store, panels, iconPath, onSettings, onExit, isEditing, onEdit }: Options) {
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
      { label: 'Edit mode', type: 'checkbox', checked: isEditing(), click: (i) => onEdit(i.checked) },
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
        submenu: accentChoices(themeById(s.theme), s.accent).map((choice) => ({
          label: choice.label,
          type: 'radio' as const,
          checked: choice.checked,
          enabled: !choice.custom,
          click: () => onSettings({ accent: choice.id })
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
