import { BrowserWindow, Menu, ipcMain, type MenuItemConstructorOptions } from 'electron'
import { randomUUID } from 'node:crypto'
import type { AssetResult } from '../shared/assets'
import { PANEL_IDS, type BackupResult, type Edge, type GymDay, type HabitInput, type PanelId, type ProfileInput, type SettingsPatch, type TaskInput, type TimerAction } from '../shared/types'
import { toDateKey } from '../shared/dates'
import type { UpdateState } from '../shared/update'
import type { SpotifyState, Stats, StatsRange } from '../shared/spotify'
import {
  addHabit, addTask, deleteHabit, deleteTask, sanitizeSettingsPatch, setDone, setGymDone, setGymOverride,
  setHabitDay, addPage, deletePage, renamePage, setPageText, setActivePage, setProfile, setSplit, setWeighIn, updateHabit, updateTask
} from './mutations'
import { ZOOMABLE, isZoomAction, stepZoom } from '../shared/zoom'
import type { EditSession, MenuEntry } from './edit'
import type { FloatManager } from './floats'
import type { PomodoroTimer } from './timer'
import type { PanelManager } from './panels'
import type { Store } from './store'

const EDGES: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

const isPanelId = (v: unknown): v is PanelId => PANEL_IDS.includes(v as PanelId)

export interface AppActions {
  changeSettings(patch: SettingsPatch): void
  confirmExit(): void
  pickAvatar(win: BrowserWindow | null): Promise<string | null>
  readAvatar(): string | null
  exportBackup(win: BrowserWindow | null): Promise<BackupResult>
  importBackup(win: BrowserWindow | null): Promise<BackupResult>
  addAsset(name: unknown, bytes: unknown): AssetResult
  chooseAsset(win: BrowserWindow | null): Promise<AssetResult[]>
  appVersion(): string
  getUpdateState(): UpdateState
  checkForUpdates(): Promise<UpdateState>
  downloadUpdate(): Promise<void>
  installUpdate(): void
  installUpdateOnQuit(): void
  dismissUpdate(): void
  getSpotifyState(): SpotifyState
  spotifyConnect(): Promise<void>
  spotifyCancel(): void
  openSpotifyDashboard(): void
  spotifyDisconnect(): void
  spotifyWatch(on: boolean): void
  spotifyStats(range: StatsRange): Stats
}

const TIMER_ACTIONS: TimerAction[] = ['start', 'pause', 'reset', 'skip']

export function registerIpc(store: Store, panels: PanelManager, timer: PomodoroTimer, edit: EditSession, actions: AppActions, floats: FloatManager): void {
  const today = () => toDateKey(new Date())
  const commit = () => panels.broadcast('data:changed', store.data)

  ipcMain.handle('data:get', () => store.data)

  ipcMain.handle('task:add', (_e, input: TaskInput) => {
    store.update((d) => addTask(d, input, today(), randomUUID()))
    commit()
  })
  ipcMain.handle('task:update', (_e, id: string, input: TaskInput) => {
    store.update((d) => updateTask(d, id, input, today(), randomUUID()))
    commit()
  })
  ipcMain.handle('task:delete', (_e, id: string) => {
    store.update((d) => deleteTask(d, id, today()))
    commit()
  })
  ipcMain.handle('task:done', (_e, taskId: string, date: string, done: boolean) => {
    store.update((d) => setDone(d, taskId, date, done, new Date().toISOString()))
    commit()
  })
  ipcMain.handle('habit:add', (_e, input: HabitInput) => {
    store.update((d) => addHabit(d, input, randomUUID()))
    commit()
  })
  ipcMain.handle('habit:update', (_e, id: string, input: HabitInput) => {
    store.update((d) => updateHabit(d, id, input))
    commit()
  })
  ipcMain.handle('habit:delete', (_e, id: string) => {
    store.update((d) => deleteHabit(d, id))
    commit()
  })
  ipcMain.handle('page:add', () => {
    store.update((d) => addPage(d, randomUUID()))
    commit()
  })
  ipcMain.handle('page:delete', (_e, id: string) => {
    store.update((d) => deletePage(d, id, randomUUID()))
    commit()
  })
  ipcMain.handle('page:rename', (_e, id: string, title: string) => {
    store.update((d) => renamePage(d, id, title))
    commit()
  })
  ipcMain.handle('page:text', (_e, id: string, text: string) => {
    store.update((d) => setPageText(d, id, text))
    commit()
  })
  ipcMain.handle('page:active', (_e, id: string) => {
    store.update((d) => setActivePage(d, id))
    commit()
  })
  ipcMain.handle('habit:set', (_e, id: string, date: string, on: boolean) => {
    store.update((d) => setHabitDay(d, id, date, on))
    commit()
  })

  ipcMain.handle('timer:get', () => timer.state)
  ipcMain.on('timer:action', (_e, action: unknown) => {
    if (TIMER_ACTIONS.includes(action as TimerAction)) timer.act(action as TimerAction)
  })

  ipcMain.on('timer:task', (_e, task: unknown) => {
    if (typeof task === 'string') timer.setTask(task)
  })
  ipcMain.handle('backup:export', (e) => actions.exportBackup(BrowserWindow.fromWebContents(e.sender)))
  ipcMain.handle('backup:import', (e) => actions.importBackup(BrowserWindow.fromWebContents(e.sender)))

  ipcMain.handle('settings:set', (_e, raw: unknown) => actions.changeSettings(sanitizeSettingsPatch(raw)))
  ipcMain.handle('app:exit', () => panels.show('confirm'))
  ipcMain.handle('app:confirm-exit', () => actions.confirmExit())
  ipcMain.handle('app:version', () => actions.appVersion())
  ipcMain.handle('update:get', () => actions.getUpdateState())
  ipcMain.handle('update:check', () => actions.checkForUpdates())
  ipcMain.handle('update:download', () => actions.downloadUpdate())
  ipcMain.handle('update:install', () => actions.installUpdate())
  ipcMain.handle('update:install-on-quit', () => {
    actions.installUpdateOnQuit()
    panels.hide('update')
  })
  ipcMain.handle('update:dismiss', () => actions.dismissUpdate())
  ipcMain.handle('spotify:get', () => actions.getSpotifyState())
  ipcMain.handle('spotify:connect', () => actions.spotifyConnect())
  ipcMain.handle('spotify:open-dashboard', () => actions.openSpotifyDashboard())
  ipcMain.handle('spotify:cancel', () => actions.spotifyCancel())
  ipcMain.handle('spotify:disconnect', () => actions.spotifyDisconnect())
  ipcMain.handle('spotify:stats', (_e, range: unknown) => actions.spotifyStats(range === '30d' || range === 'all' ? range : '7d'))
  ipcMain.on('spotify:watch', (_e, on: unknown) => actions.spotifyWatch(on === true))
  ipcMain.handle('displays:list', () => panels.listDisplays())
  ipcMain.handle('displays:move', (_e, id: number) => panels.moveAllToDisplay(id))
  ipcMain.handle('layout:reset', () => panels.resetLayout())
  ipcMain.on('panel:resize-begin', (_e, id: unknown, edge: Edge) => {
    if (isPanelId(id) && EDGES.includes(edge)) panels.beginResize(id, edge)
  })
  ipcMain.on('panel:expand', (_e, id: unknown, width: unknown, height: unknown) => {
    if (isPanelId(id) && Number.isFinite(width) && Number.isFinite(height)) panels.expand(id, Number(width), Number(height))
  })
  ipcMain.on('panel:collapse', (_e, id: unknown) => {
    if (isPanelId(id)) panels.collapse(id)
  })
  ipcMain.on('panel:resize-end', () => panels.endResize())
  ipcMain.on('app:minimize', () => panels.minimizeAll())
  ipcMain.on('app:restore', () => panels.restoreAll())
  ipcMain.on('panel:move-begin', (_e, id: unknown) => {
    if (isPanelId(id)) panels.beginMove(id)
  })
  ipcMain.on('panel:move-end', () => panels.endResize())
  ipcMain.handle('profile:set', (_e, input: ProfileInput) => {
    store.update((d) => setProfile(d, input, today()))
    commit()
  })
  ipcMain.handle('profile:pick-avatar', (e) => actions.pickAvatar(BrowserWindow.fromWebContents(e.sender)))
  ipcMain.handle('profile:get-avatar', () => actions.readAvatar())

  ipcMain.handle('gym:split', (_e, days: (GymDay | null)[]) => {
    store.update((d) => setSplit(d, days, today()))
    commit()
  })
  ipcMain.handle('gym:override', (_e, date: string, value: GymDay | null | undefined) => {
    store.update((d) => setGymOverride(d, date, value))
    commit()
  })
  ipcMain.handle('gym:done', (_e, date: string, done: boolean) => {
    store.update((d) => setGymDone(d, date, done))
    commit()
  })
  ipcMain.handle('gym:weigh-in', (_e, date: string, kg: number | null) => {
    store.update((d) => setWeighIn(d, date, kg))
    commit()
  })

  ipcMain.on('panel:zoom', (_e, id: unknown, action: unknown) => {
    if (!isPanelId(id) || !isZoomAction(action) || !(ZOOMABLE as readonly string[]).includes(id)) return
    store.update((d) => {
      const next = stepZoom(d.settings.panels[id].zoom, action)
      if (next === 1) delete d.settings.panels[id].zoom
      else d.settings.panels[id].zoom = next
    })
    commit()
  })
  ipcMain.on('panel:toggle', (_e, id: unknown) => {
    if (isPanelId(id)) panels.toggle(id)
  })
  ipcMain.on('panel:hide', (_e, id: unknown) => {
    if (!isPanelId(id)) return
    if (id === 'designer' || id === 'layers') edit.setActive(false)
    else panels.hide(id)
  })
  const needEdit: AssetResult = { ok: false, error: 'Turn on Edit mode first' }
  ipcMain.handle('asset:add', (_e, name: unknown, bytes: unknown) => (edit.state.active ? actions.addAsset(name, bytes) : needEdit))
  ipcMain.handle('asset:choose', (e) => (edit.state.active ? actions.chooseAsset(BrowserWindow.fromWebContents(e.sender)) : [needEdit]))
  ipcMain.handle('edit:get-state', () => edit.state)
  ipcMain.on('edit:set-active', (_e, on: unknown) => {
    if (typeof on === 'boolean') edit.setActive(on)
  })
  ipcMain.on('edit:select', (_e, selection: unknown) => edit.select(selection))
  ipcMain.on('edit:select-request', (_e, r: unknown) => {
    if (!edit.state.active || typeof r !== 'object' || r === null) return
    const req = r as { panel?: unknown; ids?: unknown; additive?: unknown }
    if (req.panel === 'free') edit.selectFree(req.ids, req.additive)
    else panels.broadcast('edit:select-request', r)
  })
  ipcMain.on('float:drag-begin', (_e, id: unknown) => floats.beginDrag(id))
  ipcMain.on('float:gesture-begin', (_e, id: unknown, kind: unknown, handle: unknown, snap: unknown) => floats.beginGesture(id, kind, handle, snap))
  ipcMain.on('float:gesture-end', (_e, id: unknown) => floats.endGesture(id))
  ipcMain.on('float:drag-end', (_e, id: unknown) => void floats.endDrag(id))
  ipcMain.on('edit:hover', (_e, r: unknown) => {
    if (edit.state.active && typeof r === 'object' && r !== null) panels.broadcast('edit:hover', r)
  })
  ipcMain.on('edit:report-dom', (_e, panel: unknown, ids: unknown) => edit.reportDom(panel, ids))
  ipcMain.on('edit:patch-many', (_e, keys: unknown, patch: unknown) => edit.patchMany(keys, patch))
  ipcMain.on('edit:reset-many', (_e, keys: unknown) => edit.resetMany(keys))
  ipcMain.on('edit:sticker-update-many', (_e, ids: unknown, patch: unknown) => edit.updateStickers(ids, patch))
  ipcMain.on('edit:resize-element', (_e, key: unknown, width: unknown, height: unknown, x: unknown, y: unknown) => edit.resizeElement(key, width, height, x, y))
  ipcMain.on('edit:context-menu', (e, panel: unknown, ids: unknown) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const entries = edit.contextMenu(panel, ids)
    if (!win || entries.length === 0) return
    const toTemplate = (list: MenuEntry[]): MenuItemConstructorOptions[] =>
      list.map((m): MenuItemConstructorOptions => {
        if (m.separator) return { type: 'separator' }
        if (m.submenu) return { label: m.label, submenu: toTemplate(m.submenu) }
        return { label: m.label, type: m.checked === undefined ? 'normal' : 'radio', checked: m.checked, click: () => m.run?.() }
      })
    Menu.buildFromTemplate(toTemplate(entries)).popup({ window: win })
  })
  ipcMain.on('edit:set-anchors', (_e, updates: unknown) => edit.setAnchors(updates))
  ipcMain.on('edit:space-click', () => edit.spaceClick())
  ipcMain.on('edit:crop-mode', (_e, id: unknown) => edit.setCropping(id ?? null))
  ipcMain.on('edit:recent-color', (_e, hex: unknown) => edit.addRecentColor(hex))
  ipcMain.on('edit:preset-save', (_e, panel: unknown, name: unknown) => edit.savePreset(panel, name))
  ipcMain.on('edit:preset-delete', (_e, id: unknown) => edit.deletePreset(id))
  ipcMain.on('edit:preset-apply', (_e, id: unknown, panel: unknown) => edit.applyPreset(id, panel))
  ipcMain.on('edit:patch', (_e, key: unknown, patch: unknown) => edit.patch(key, patch))
  ipcMain.on('edit:undo', () => edit.undo())
  ipcMain.on('edit:redo', () => edit.redo())
  ipcMain.on('edit:reset', (_e, key: unknown) => edit.reset(key))
  ipcMain.on('edit:reset-all', () => edit.resetAll())
  ipcMain.on('edit:move', (_e, key: unknown, x: unknown, y: unknown) => edit.move(key, x, y))
  ipcMain.on('edit:reset-position', (_e, key: unknown) => edit.resetPosition(key))
  ipcMain.on('edit:sticker-add', (_e, draft: unknown) => edit.addSticker(draft))
  ipcMain.on('edit:sticker-update', (_e, id: unknown, patch: unknown) => edit.updateSticker(id, patch))
  ipcMain.on('edit:sticker-delete', (_e, id: unknown) => edit.deleteSticker(id))
  ipcMain.on('edit:sticker-duplicate', (_e, id: unknown) => edit.duplicateSticker(id))
  ipcMain.on('edit:sticker-order', (_e, id: unknown, direction: unknown) => edit.reorderSticker(id, direction))
  ipcMain.on('edit:sticker-place', (_e, id: unknown, layer: unknown, aboveId: unknown) => edit.placeSticker(id, layer, aboveId ?? null))
  ipcMain.on('edit:arrange', (_e, panel: unknown, id: unknown, region: unknown, aboveId: unknown) => edit.arrange(panel, id, region, aboveId ?? null))
  ipcMain.on('edit:background', (_e, key: unknown, bg: unknown) => edit.setBackground(key, bg))
  ipcMain.on('asset:delete', (_e, id: unknown) => edit.deleteAsset(id))
}
