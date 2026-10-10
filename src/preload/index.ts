import { contextBridge, ipcRenderer } from 'electron'
import type { TimerState } from '../shared/pomodoro'
import type { UpdateState } from '../shared/update'
import type { SpotifyState } from '../shared/spotify'
import type { AppData, EditState, HoverRequest, SelectRequest, ShimaApi } from '../shared/types'

const api: ShimaApi = {
  getData: () => ipcRenderer.invoke('data:get'),
  onChange: (cb) => {
    const handler = (_e: unknown, data: AppData) => cb(data)
    ipcRenderer.on('data:changed', handler)
    return () => ipcRenderer.removeListener('data:changed', handler)
  },
  getTimer: () => ipcRenderer.invoke('timer:get'),
  onTimer: (cb) => {
    const handler = (_e: unknown, s: TimerState) => cb(s)
    ipcRenderer.on('timer:changed', handler)
    return () => ipcRenderer.removeListener('timer:changed', handler)
  },
  timerAction: (action) => ipcRenderer.send('timer:action', action),
  setTimerTask: (task) => ipcRenderer.send('timer:task', task),
  addTask: (input) => ipcRenderer.invoke('task:add', input),
  updateTask: (id, input) => ipcRenderer.invoke('task:update', id, input),
  deleteTask: (id) => ipcRenderer.invoke('task:delete', id),
  setDone: (taskId, date, done) => ipcRenderer.invoke('task:done', taskId, date, done),
  addHabit: (input) => ipcRenderer.invoke('habit:add', input),
  updateHabit: (id, input) => ipcRenderer.invoke('habit:update', id, input),
  deleteHabit: (id) => ipcRenderer.invoke('habit:delete', id),
  addPage: () => ipcRenderer.invoke('page:add'),
  deletePage: (id) => ipcRenderer.invoke('page:delete', id),
  renamePage: (id, title) => ipcRenderer.invoke('page:rename', id, title),
  setPageText: (id, text) => ipcRenderer.invoke('page:text', id, text),
  setActivePage: (id) => ipcRenderer.invoke('page:active', id),
  setHabitDay: (id, date, on) => ipcRenderer.invoke('habit:set', id, date, on),
  zoomPanel: (id, action) => ipcRenderer.send('panel:zoom', id, action),
  hidePanel: (id) => ipcRenderer.send('panel:hide', id),
  togglePanel: (id) => ipcRenderer.send('panel:toggle', id),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  requestExit: () => ipcRenderer.invoke('app:exit'),
  confirmExit: () => ipcRenderer.invoke('app:confirm-exit'),
  getVersion: () => ipcRenderer.invoke('app:version'),
  getUpdateState: () => ipcRenderer.invoke('update:get'),
  onUpdateState: (cb) => {
    const handler = (_e: unknown, s: UpdateState) => cb(s)
    ipcRenderer.on('update:state', handler)
    return () => ipcRenderer.removeListener('update:state', handler)
  },
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  installUpdateOnQuit: () => ipcRenderer.invoke('update:install-on-quit'),
  dismissUpdate: () => ipcRenderer.invoke('update:dismiss'),
  getSpotifyState: () => ipcRenderer.invoke('spotify:get'),
  onSpotifyState: (cb) => {
    const handler = (_e: unknown, s: SpotifyState) => cb(s)
    ipcRenderer.on('spotify:state', handler)
    return () => ipcRenderer.removeListener('spotify:state', handler)
  },
  spotifyConnect: () => ipcRenderer.invoke('spotify:connect'),
  spotifyDisconnect: () => ipcRenderer.invoke('spotify:disconnect'),
  spotifyWatch: (on) => ipcRenderer.send('spotify:watch', on),
  spotifyStats: (range) => ipcRenderer.invoke('spotify:stats', range),
  getEditState: () => ipcRenderer.invoke('edit:get-state'),
  onEditState: (cb) => {
    const handler = (_e: unknown, s: EditState) => cb(s)
    ipcRenderer.on('edit:state', handler)
    return () => ipcRenderer.removeListener('edit:state', handler)
  },
  setEditActive: (on) => ipcRenderer.send('edit:set-active', on),
  editSelect: (selection) => ipcRenderer.send('edit:select', selection),
  editSelectRequest: (r) => ipcRenderer.send('edit:select-request', r),
  onSelectRequest: (cb) => {
    const handler = (_e: unknown, r: SelectRequest) => cb(r)
    ipcRenderer.on('edit:select-request', handler)
    return () => ipcRenderer.removeListener('edit:select-request', handler)
  },
  editHover: (r) => ipcRenderer.send('edit:hover', r),
  onHover: (cb) => {
    const handler = (_e: unknown, r: HoverRequest) => cb(r)
    ipcRenderer.on('edit:hover', handler)
    return () => ipcRenderer.removeListener('edit:hover', handler)
  },
  editReportDom: (panel, ids) => ipcRenderer.send('edit:report-dom', panel, ids),
  editResizeElement: (key, width, height, x, y) => ipcRenderer.send('edit:resize-element', key, width, height, x, y),
  floatDragBegin: (id) => ipcRenderer.send('float:drag-begin', id),
  onFloatPreview: (cb) => {
    const handler = (_e: unknown, r: { id: string; patch: Record<string, unknown> | null }) => cb(r)
    ipcRenderer.on('float:preview', handler)
    return () => ipcRenderer.removeListener('float:preview', handler)
  },
  floatGestureBegin: (id, kind, handle, snap) => ipcRenderer.send('float:gesture-begin', id, kind, handle, snap),
  floatGestureEnd: (id) => ipcRenderer.send('float:gesture-end', id),
  floatDragEnd: (id) => ipcRenderer.send('float:drag-end', id),
  editContextMenu: (panel, ids) => ipcRenderer.send('edit:context-menu', panel, ids),
  editSetAnchors: (updates) => ipcRenderer.send('edit:set-anchors', updates),
  editSpaceClick: () => ipcRenderer.send('edit:space-click'),
  editCropMode: (id) => ipcRenderer.send('edit:crop-mode', id),
  editRecentColor: (hex) => ipcRenderer.send('edit:recent-color', hex),
  editPresetSave: (panel, name) => ipcRenderer.send('edit:preset-save', panel, name),
  editPresetDelete: (id) => ipcRenderer.send('edit:preset-delete', id),
  editPresetApply: (id, panel) => ipcRenderer.send('edit:preset-apply', id, panel),
  editPatch: (key, patch) => ipcRenderer.send('edit:patch', key, patch),
  editPatchMany: (keys, patch) => ipcRenderer.send('edit:patch-many', keys, patch),
  editResetMany: (keys) => ipcRenderer.send('edit:reset-many', keys),
  editStickerUpdateMany: (ids, patch) => ipcRenderer.send('edit:sticker-update-many', ids, patch),
  editUndo: () => ipcRenderer.send('edit:undo'),
  editRedo: () => ipcRenderer.send('edit:redo'),
  editReset: (key) => ipcRenderer.send('edit:reset', key),
  editResetAll: () => ipcRenderer.send('edit:reset-all'),
  editMove: (key, x, y) => ipcRenderer.send('edit:move', key, x, y),
  editResetPosition: (key) => ipcRenderer.send('edit:reset-position', key),
  editStickerAdd: (draft) => ipcRenderer.send('edit:sticker-add', draft),
  editStickerUpdate: (id, patch) => ipcRenderer.send('edit:sticker-update', id, patch),
  editStickerDelete: (id) => ipcRenderer.send('edit:sticker-delete', id),
  editStickerDuplicate: (id) => ipcRenderer.send('edit:sticker-duplicate', id),
  editStickerOrder: (id, direction) => ipcRenderer.send('edit:sticker-order', id, direction),
  editStickerPlace: (id, layer, aboveId) => ipcRenderer.send('edit:sticker-place', id, layer, aboveId),
  editArrange: (panel, id, region, aboveId) => ipcRenderer.send('edit:arrange', panel, id, region, aboveId),
  editBackground: (key, bg) => ipcRenderer.send('edit:background', key, bg),
  assetAdd: (name, bytes) => ipcRenderer.invoke('asset:add', name, bytes),
  assetChoose: () => ipcRenderer.invoke('asset:choose'),
  assetDelete: (id) => ipcRenderer.send('asset:delete', id),
  expandPanel: (id, width, height) => ipcRenderer.send('panel:expand', id, width, height),
  collapsePanel: (id) => ipcRenderer.send('panel:collapse', id),
  beginResize: (id, edge) => ipcRenderer.send('panel:resize-begin', id, edge),
  endResize: () => ipcRenderer.send('panel:resize-end'),
  listDisplays: () => ipcRenderer.invoke('displays:list'),
  moveAllToDisplay: (id) => ipcRenderer.invoke('displays:move', id),
  resetLayout: () => ipcRenderer.invoke('layout:reset'),
  minimizeAll: () => ipcRenderer.send('app:minimize'),
  restoreAll: () => ipcRenderer.send('app:restore'),
  beginMove: (id) => ipcRenderer.send('panel:move-begin', id),
  endMove: () => ipcRenderer.send('panel:move-end'),
  setProfile: (input) => ipcRenderer.invoke('profile:set', input),
  pickAvatar: () => ipcRenderer.invoke('profile:pick-avatar'),
  getAvatar: () => ipcRenderer.invoke('profile:get-avatar'),
  setSplit: (days) => ipcRenderer.invoke('gym:split', days),
  setGymOverride: (date, value) => ipcRenderer.invoke('gym:override', date, value),
  setGymDone: (date, done) => ipcRenderer.invoke('gym:done', date, done),
  setWeighIn: (date, kg) => ipcRenderer.invoke('gym:weigh-in', date, kg),
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import')
}

contextBridge.exposeInMainWorld('shima', api)
