import { contextBridge, ipcRenderer } from 'electron'
import type { TimerState } from '../shared/pomodoro'
import type { AppData, EditState, ShimaApi } from '../shared/types'

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
  setNotes: (text) => ipcRenderer.invoke('notes:set', text),
  setHabitDay: (id, date, on) => ipcRenderer.invoke('habit:set', id, date, on),
  hidePanel: (id) => ipcRenderer.send('panel:hide', id),
  togglePanel: (id) => ipcRenderer.send('panel:toggle', id),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  requestExit: () => ipcRenderer.invoke('app:exit'),
  confirmExit: () => ipcRenderer.invoke('app:confirm-exit'),
  getEditState: () => ipcRenderer.invoke('edit:get-state'),
  onEditState: (cb) => {
    const handler = (_e: unknown, s: EditState) => cb(s)
    ipcRenderer.on('edit:state', handler)
    return () => ipcRenderer.removeListener('edit:state', handler)
  },
  setEditActive: (on) => ipcRenderer.send('edit:set-active', on),
  editSelect: (selection) => ipcRenderer.send('edit:select', selection),
  editPatch: (key, patch) => ipcRenderer.send('edit:patch', key, patch),
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
