import { app, dialog, Notification, screen } from 'electron'
import fs from 'node:fs'
import { join } from 'node:path'
import { toDateKey } from '../shared/dates'
import { PANEL_IDS, type BackupResult, type SettingsPatch } from '../shared/types'
import { chooseAvatar, readAvatarDataUrl, removeAvatar, writeAvatar } from './avatar'
import { avatarBytes, buildBackup, parseBackup } from './backup'
import { registerIpc } from './ipc'
import { addPomodoro, setAvatarStamp } from './mutations'
import { PomodoroTimer } from './timer'
import { PanelManager } from './panels'
import { startScheduler } from './scheduler'
import { Store, hideTransientPanels } from './store'
import { createTray } from './tray'

app.setAppUserModelId('com.jirodavid.shimado')

if (!app.requestSingleInstanceLock()) app.quit()
else boot()

function boot(): void {
  const userData = app.getPath('userData')
  const store = new Store(join(userData, 'shimado-data.json'))
  const resources = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
  const windowIcon = join(resources, 'icon.ico')
  let tray: ReturnType<typeof createTray> | undefined

  const panels = new PanelManager(
    store,
    { icon: windowIcon, preload: join(__dirname, '../preload/index.js'), devUrl: process.env['ELECTRON_RENDERER_URL'], file: join(__dirname, '../renderer/index.html') },
    () => {
      tray?.refresh()
      panels.broadcast('data:changed', store.data)
    }
  )

  const timer = new PomodoroTimer({
    onChange: (s) => panels.broadcast('timer:changed', s),
    onFocusDone: (task) => {
      store.update((d) => addPomodoro(d, toDateKey(new Date()), task))
      panels.broadcast('data:changed', store.data)
    },
    onNotifyClick: () => panels.show('focus')
  })

  const changeSettings = (patch: SettingsPatch) => {
    const previousScale = store.data.settings.textScale
    store.update((d) => {
      Object.assign(d.settings, patch)
    })
    if (patch.alwaysOnTop !== undefined) panels.applyAlwaysOnTop()
    if (patch.textScale !== undefined && patch.textScale !== previousScale) panels.applyScale(previousScale)
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

  const exportBackup = async (): Promise<BackupResult> => {
    const result = await dialog.showSaveDialog({
      title: 'Export ShimaDo backup',
      defaultPath: `shimado-backup-${toDateKey(new Date())}.json`,
      filters: [{ name: 'ShimaDo backup', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return { ok: false, message: '' }
    try {
      fs.writeFileSync(result.filePath, buildBackup(store.data, readAvatarDataUrl(userData)))
      return { ok: true, message: 'Backup saved' }
    } catch (e) {
      return { ok: false, message: `Could not save: ${(e as Error).message}` }
    }
  }

  const importBackup = async (): Promise<BackupResult> => {
    const picked = await dialog.showOpenDialog({
      title: 'Import ShimaDo backup',
      properties: ['openFile'],
      filters: [{ name: 'ShimaDo backup', extensions: ['json'] }]
    })
    if (picked.canceled || picked.filePaths.length === 0) return { ok: false, message: '' }
    let parsed: ReturnType<typeof parseBackup>
    try {
      parsed = parseBackup(fs.readFileSync(picked.filePaths[0], 'utf8'))
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
    const answer = await dialog.showMessageBox({
      type: 'warning',
      title: 'Import backup',
      message: 'Replace everything with this backup?',
      detail: 'All current tasks, history and settings will be overwritten. ShimaDo will restart.',
      buttons: ['Replace', 'Cancel'],
      defaultId: 1,
      cancelId: 1
    })
    if (answer.response !== 0) return { ok: false, message: '' }
    hideTransientPanels(parsed.data)
    store.data = parsed.data
    store.save()
    if (parsed.avatar) writeAvatar(userData, avatarBytes(parsed.avatar))
    else removeAvatar(userData)
    app.relaunch()
    app.exit(0)
    return { ok: true, message: 'Imported' }
  }

  app.on('second-instance', () => panels.show('checklist'))
  app.on('window-all-closed', () => {})
  app.on('before-quit', () => {
    panels.collapseAll()
    panels.flush()
    timer.dispose()
    panels.quitting = true
  })

  app.whenReady().then(() => {
    store.load()
    registerIpc(store, panels, timer, { changeSettings, confirmExit, pickAvatar, readAvatar: () => readAvatarDataUrl(userData), exportBackup, importBackup })
    tray = createTray({ store, panels, iconPath: windowIcon, onSettings: changeSettings, onExit: () => app.quit() })

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
