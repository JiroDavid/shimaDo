import { app, dialog, Notification, protocol, screen } from 'electron'
import fs from 'node:fs'
import { basename, join } from 'node:path'
import { ASSET_SCHEME } from '../shared/assets'
import { toDateKey } from '../shared/dates'
import { PANEL_IDS, type BackupResult, type SettingsPatch } from '../shared/types'
import { chooseAvatar, readAvatarDataUrl, removeAvatar, writeAvatar } from './avatar'
import { AssetStore, serveAsset } from './assets'
import { avatarBytes, buildBackup, parseBackup } from './backup'
import { registerIpc } from './ipc'
import { addPomodoro, claimWelcome, setAvatarStamp } from './mutations'
import { PomodoroTimer } from './timer'
import { PanelManager } from './panels'
import { startScheduler } from './scheduler'
import { Store, hideTransientPanels } from './store'
import { EditSession } from './edit'
import { createTray } from './tray'

protocol.registerSchemesAsPrivileged([{ scheme: ASSET_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }])

app.setAppUserModelId('com.jirodavid.shimado')

if (!app.requestSingleInstanceLock()) app.quit()
else boot()

function boot(): void {
  const userData = app.getPath('userData')
  const store = new Store(join(userData, 'shimado-data.json'))
  const assets = new AssetStore(join(userData, 'assets'), { data: () => store.data, update: (fn) => store.update(fn) })
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

  const edit = new EditSession({
    data: () => store.data,
    update: (fn) => store.update(fn),
    show: (id) => panels.show(id),
    hide: (id) => panels.hide(id),
    broadcast: (channel, payload) => panels.broadcast(channel, payload),
    changed: () => tray?.refresh()
  })

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
      fs.writeFileSync(result.filePath, buildBackup(store.data, readAvatarDataUrl(userData), assets.readAll()))
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
    assets.replaceAll(parsed.assetFiles)
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
    assets.init()
    protocol.handle(ASSET_SCHEME, (request) => {
      const r = serveAsset(assets, request.url)
      return new Response(r.body ? new Uint8Array(r.body) : null, { status: r.status, headers: r.headers })
    })
    registerIpc(store, panels, timer, edit, {
      addAsset: (name, bytes) => {
        const u8 = bytes instanceof Uint8Array ? bytes : bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : null
        if (!u8) return { ok: false, error: 'Could not read that file' }
        const result = assets.add(name, u8)
        if (result.ok) panels.broadcast('data:changed', store.data)
        return result
      },
      chooseAsset: async () => {
        const picked = await dialog.showOpenDialog({
          title: 'Choose an image',
          properties: ['openFile'],
          filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'] }]
        })
        if (picked.canceled || picked.filePaths.length === 0) return { ok: false, error: '' }
        const result = assets.add(basename(picked.filePaths[0]), new Uint8Array(fs.readFileSync(picked.filePaths[0])))
        if (result.ok) panels.broadcast('data:changed', store.data)
        return result
      },
      changeSettings, confirmExit, pickAvatar, readAvatar: () => readAvatarDataUrl(userData), exportBackup, importBackup })
    tray = createTray({ store, panels, iconPath: windowIcon, onSettings: changeSettings, onExit: () => app.quit(), isEditing: () => edit.state.active, onEdit: (on) => edit.setActive(on) })

    for (const id of PANEL_IDS) {
      if (id === 'mini') continue
      if (id === 'bar' || id === 'checklist') panels.show(id)
      else if (id !== 'settings' && id !== 'profile' && id !== 'confirm' && id !== 'welcome' && id !== 'designer' && store.data.settings.panels[id].visible) panels.show(id)
    }

    panels.fitAll()
    if (store.update((d) => claimWelcome(d))) panels.show('welcome')
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
