import { app, Notification, screen } from 'electron'
import { join } from 'node:path'
import { PANEL_IDS, type SettingsPatch } from '../shared/types'
import { chooseAvatar, readAvatarDataUrl } from './avatar'
import { registerIpc } from './ipc'
import { setAvatarStamp } from './mutations'
import { PanelManager } from './panels'
import { startScheduler } from './scheduler'
import { Store } from './store'
import { createTray } from './tray'

app.setAppUserModelId('com.jirodavid.shimado')

if (!app.requestSingleInstanceLock()) app.quit()
else boot()

function boot(): void {
  const userData = app.getPath('userData')
  const store = new Store(join(userData, 'shimado-data.json'))
  const iconPath = app.isPackaged ? join(process.resourcesPath, 'icon.png') : join(app.getAppPath(), 'resources', 'icon.png')
  let tray: ReturnType<typeof createTray> | undefined

  const panels = new PanelManager(
    store,
    { icon: iconPath, preload: join(__dirname, '../preload/index.js'), devUrl: process.env['ELECTRON_RENDERER_URL'], file: join(__dirname, '../renderer/index.html') },
    () => {
      tray?.refresh()
      panels.broadcast('data:changed', store.data)
    }
  )

  const changeSettings = (patch: SettingsPatch) => {
    store.update((d) => {
      Object.assign(d.settings, patch)
    })
    if (patch.alwaysOnTop !== undefined) panels.applyAlwaysOnTop()
    if (patch.launchAtStartup !== undefined && app.isPackaged) {
      app.setLoginItemSettings({ openAtLogin: patch.launchAtStartup })
    }
    panels.broadcast('data:changed', store.data)
    tray?.refresh()
  }

  const confirmExit = () => {
    app.quit()
  }

  const pickAvatar = async (): Promise<string | null> => {
    const result = await chooseAvatar(userData)
    if (result === 'invalid') return 'That file is not a readable image'
    if (result === 'picked') {
      store.update((d) => setAvatarStamp(d, Date.now()))
      panels.broadcast('data:changed', store.data)
    }
    return null
  }

  app.on('second-instance', () => panels.show('checklist'))
  app.on('window-all-closed', () => {})
  app.on('before-quit', () => {
    panels.flush()
    panels.quitting = true
  })

  app.whenReady().then(() => {
    store.load()
    registerIpc(store, panels, { changeSettings, confirmExit, pickAvatar, readAvatar: () => readAvatarDataUrl(userData) })
    tray = createTray({ store, panels, iconPath, onSettings: changeSettings, onExit: () => app.quit() })

    for (const id of PANEL_IDS) {
      if (id === 'mini') continue
      if (id === 'bar' || id === 'checklist') panels.show(id)
      else if (id !== 'settings' && id !== 'profile' && id !== 'confirm' && store.data.settings.panels[id].visible) panels.show(id)
    }

    panels.fitAll()
    screen.on('display-added', () => panels.fitAll())
    screen.on('display-removed', () => panels.fitAll())
    screen.on('display-metrics-changed', () => panels.fitAll())

    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: store.data.settings.launchAtStartup })

    startScheduler(store, (occ) => {
      const n = new Notification({ title: 'ShimaDo', body: `${occ.task.time}  ${occ.task.title}` })
      n.on('click', () => panels.show('checklist'))
      n.show()
    })
  })
}
