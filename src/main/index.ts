import { app, dialog, Notification, protocol, safeStorage, screen, shell, type BrowserWindow, type MessageBoxOptions, type OpenDialogOptions } from 'electron'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
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
import { FloatManager } from './floats'
import { SpaceManager } from './space'
import { createTray } from './tray'
import { autoUpdater } from 'electron-updater'
import { UpdateController, type UpdaterLike } from './updater'
import { SpotifyAuth } from './spotify/auth'
import { SpotifyApi } from './spotify/api'
import { SpotifyController } from './spotify/controller'
import { HistoryStore } from './spotify/history'
import { createTokenStore } from './spotify/tokenStore'
import { shouldRaisePrompt, type UpdateState } from '../shared/update'

const MAX_BATCH = 50

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
  let stopUpdates = () => {}
  let stopSpotify = () => {}

  const panels = new PanelManager(
    store,
    { icon: windowIcon, preload: join(__dirname, '../preload/index.js'), devUrl: process.env['ELECTRON_RENDERER_URL'], file: join(__dirname, '../renderer/index.html') },
    () => {
      tray?.refresh()
      panels.broadcast('data:changed', store.data)
    }
  )

  let floats!: FloatManager
  let space!: SpaceManager
  const edit = new EditSession({
    data: () => store.data,
    update: (fn) => store.update(fn),
    show: (id) => panels.show(id),
    hide: (id) => panels.hide(id),
    broadcast: (channel, payload) => panels.broadcast(channel, payload),
    changed: () => {
      tray?.refresh()
      floats.sync()
      space.sync()
    },
    removeAsset: (id) => assets.remove(id),
    newId: () => randomUUID(),
    spawnPoint: (size, index) => floats.spawnPoint(size, index),
    moveStickerToSpace: (id) => void floats.moveToSpace(id)
  })
  floats = new FloatManager(store, panels, edit, {
    icon: windowIcon,
    preload: join(__dirname, '../preload/index.js'),
    devUrl: process.env['ELECTRON_RENDERER_URL'],
    file: join(__dirname, '../renderer/index.html')
  })
  space = new SpaceManager(store, panels, floats, edit, {
    icon: windowIcon,
    preload: join(__dirname, '../preload/index.js'),
    devUrl: process.env['ELECTRON_RENDERER_URL'],
    file: join(__dirname, '../renderer/index.html')
  })
  panels.onMoved = () => space.sync()
  panels.onFocus = () => floats.raiseAll()
  panels.onData = () => {
    floats.sync()
    space.sync()
  }

  const timer = new PomodoroTimer({
    onChange: (s) => panels.broadcast('timer:changed', s),
    onFocusDone: (task) => {
      store.update((d) => addPomodoro(d, toDateKey(new Date()), task))
      panels.broadcast('data:changed', store.data)
    },
    onNotifyClick: () => panels.show('focus')
  })

  let shownUpdate: UpdateState = { kind: 'idle' }
  const updates = new UpdateController(autoUpdater as unknown as UpdaterLike, app.isPackaged, (s) => {
    panels.broadcast('update:state', s)
    if (shouldRaisePrompt(shownUpdate, s)) panels.show('update')
    else if (s.kind === 'idle') panels.hide('update')
    shownUpdate = s
  })

  const history = new HistoryStore(join(userData, 'spotify-history.json'))
  history.load()
  const spotifyAuth = new SpotifyAuth({
    clientId: () => store.data.settings.spotifyClientId,
    store: createTokenStore(join(userData, 'spotify-token.bin'), safeStorage),
    openUrl: (url) => shell.openExternal(url)
  })
  const spotify = new SpotifyController({
    clientId: () => store.data.settings.spotifyClientId,
    auth: spotifyAuth,
    api: new SpotifyApi(spotifyAuth),
    history,
    broadcast: (s) => panels.broadcast('spotify:state', s)
  })

  const checkForUpdates = (): Promise<UpdateState> => updates.check(true)

  const changeSettings = (patch: SettingsPatch) => {
    const previousScale = store.data.settings.textScale
    const previousClientId = store.data.settings.spotifyClientId
    store.update((d) => {
      Object.assign(d.settings, patch)
    })
    if (patch.alwaysOnTop !== undefined) panels.applyAlwaysOnTop()
    if (patch.textScale !== undefined && patch.textScale !== previousScale) panels.applyScale(previousScale)
    if (patch.launchAtStartup !== undefined && app.isPackaged) {
      app.setLoginItemSettings({ openAtLogin: patch.launchAtStartup })
    }
    if (patch.spotifyClientId !== undefined && patch.spotifyClientId !== previousClientId) spotify.clientIdChanged()
    panels.broadcast('data:changed', store.data)
    tray?.refresh()
  }

  const confirmExit = () => {
    app.quit()
  }

  const openDialog = (win: BrowserWindow | null, options: OpenDialogOptions) => (win ? dialog.showOpenDialog(win, options) : dialog.showOpenDialog(options))

  const pickAvatar = async (win: BrowserWindow | null): Promise<string | null> => {
    const result = await chooseAvatar(userData, win)
    if (result === 'invalid') return 'That file is not a readable image'
    if (result === 'picked') {
      store.update((d) => setAvatarStamp(d, Date.now()))
      panels.broadcast('data:changed', store.data)
    }
    return null
  }

  const exportBackup = async (win: BrowserWindow | null): Promise<BackupResult> => {
    const saveOptions = {
      title: 'Export ShimaDo backup',
      defaultPath: `shimado-backup-${toDateKey(new Date())}.json`,
      filters: [{ name: 'ShimaDo backup', extensions: ['json'] }]
    }
    const result = win ? await dialog.showSaveDialog(win, saveOptions) : await dialog.showSaveDialog(saveOptions)
    if (result.canceled || !result.filePath) return { ok: false, message: '' }
    try {
      fs.writeFileSync(result.filePath, buildBackup(store.data, readAvatarDataUrl(userData), assets.readAll()))
      return { ok: true, message: 'Backup saved' }
    } catch (e) {
      return { ok: false, message: `Could not save: ${(e as Error).message}` }
    }
  }

  const importBackup = async (win: BrowserWindow | null): Promise<BackupResult> => {
    const picked = await openDialog(win, {
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
    const messageOptions: MessageBoxOptions = {
      type: 'warning',
      title: 'Import backup',
      message: 'Replace everything with this backup?',
      detail: 'All current tasks, history and settings will be overwritten. ShimaDo will restart.',
      buttons: ['Replace', 'Cancel'],
      defaultId: 1,
      cancelId: 1
    }
    const answer = win ? await dialog.showMessageBox(win, messageOptions) : await dialog.showMessageBox(messageOptions)
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
    stopUpdates()
    stopSpotify()
    floats.dispose()
    space.dispose()
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
      chooseAsset: async (win) => {
        const picked = await openDialog(win, {
          title: 'Choose images',
          properties: ['openFile', 'multiSelections'],
          filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'] }]
        })
        if (picked.canceled || picked.filePaths.length === 0) return []
        const results = picked.filePaths.slice(0, MAX_BATCH).map((file) => {
          try {
            return assets.add(basename(file), new Uint8Array(fs.readFileSync(file)))
          } catch {
            return { ok: false as const, error: `Could not read ${basename(file)}` }
          }
        })
        if (results.some((r) => r.ok)) panels.broadcast('data:changed', store.data)
        return results
      },
      getSpotifyState: () => spotify.state,
      spotifyConnect: () => spotify.connect(),
      spotifyCancel: () => spotify.cancel(),
      spotifyDisconnect: () => spotify.disconnect(),
      spotifyWatch: (on) => spotify.setWatching(on),
      spotifyStats: (range) => spotify.stats(range),
      appVersion: () => app.getVersion(),
      getUpdateState: () => updates.state,
      checkForUpdates,
      downloadUpdate: () => updates.download(),
      installUpdate: () => updates.installNow(),
      installUpdateOnQuit: () => updates.installOnQuit(),
      dismissUpdate: () => updates.later(),
      changeSettings, confirmExit, pickAvatar, readAvatar: () => readAvatarDataUrl(userData), exportBackup, importBackup }, floats)
    tray = createTray({ store, panels, iconPath: windowIcon, onSettings: changeSettings, onExit: () => app.quit(), isEditing: () => edit.state.active, onEdit: (on) => edit.setActive(on),
      onCheckUpdates: () => void checkForUpdates().then((s) => {
        if (s.kind === 'current') new Notification({ title: 'ShimaDo', body: "You're up to date" }).show()
        else if (s.kind === 'error') new Notification({ title: 'ShimaDo', body: `Update check failed: ${s.message}` }).show()
      }) })

    for (const id of PANEL_IDS) {
      if (id === 'mini') continue
      if (id === 'bar' || id === 'checklist') panels.show(id)
      else if (id !== 'settings' && id !== 'profile' && id !== 'confirm' && id !== 'update' && id !== 'welcome' && id !== 'designer' && id !== 'layers' && store.data.settings.panels[id].visible) panels.show(id)
    }

    panels.fitAll()
    floats.sync()
    if (store.update((d) => claimWelcome(d))) panels.show('welcome')
    const displaysChanged = () => {
      panels.fitAll()
      space.sync()
    }
    screen.on('display-added', displaysChanged)
    screen.on('display-removed', displaysChanged)
    screen.on('display-metrics-changed', displaysChanged)

    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: store.data.settings.launchAtStartup })

    stopUpdates = updates.start()
    stopSpotify = spotify.start()

    startScheduler(store, (occ) => {
      const n = new Notification({ title: 'ShimaDo', body: `${occ.task.time}  ${occ.task.title}` })
      n.on('click', () => panels.show('checklist'))
      n.show()
    })
  })
}
