import { contextBridge, ipcRenderer } from 'electron'
import type { AppData, ShimaApi } from '../shared/types'

const api: ShimaApi = {
  getData: () => ipcRenderer.invoke('data:get'),
  onChange: (cb) => {
    const handler = (_e: unknown, data: AppData) => cb(data)
    ipcRenderer.on('data:changed', handler)
    return () => ipcRenderer.removeListener('data:changed', handler)
  },
  addTask: (input) => ipcRenderer.invoke('task:add', input),
  updateTask: (id, input) => ipcRenderer.invoke('task:update', id, input),
  deleteTask: (id) => ipcRenderer.invoke('task:delete', id),
  setDone: (taskId, date, done) => ipcRenderer.invoke('task:done', taskId, date, done),
  setNicotine: (date, on) => ipcRenderer.invoke('nicotine:set', date, on),
  resizePanel: (id, width, height) => ipcRenderer.send('panel:resize', id, width, height),
  hidePanel: (id) => ipcRenderer.send('panel:hide', id),
  togglePanel: (id) => ipcRenderer.send('panel:toggle', id),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  requestExit: () => ipcRenderer.invoke('app:exit'),
  setProfile: (input) => ipcRenderer.invoke('profile:set', input),
  pickAvatar: () => ipcRenderer.invoke('profile:pick-avatar'),
  getAvatar: () => ipcRenderer.invoke('profile:get-avatar'),
  setSplit: (days) => ipcRenderer.invoke('gym:split', days),
  setGymOverride: (date, value) => ipcRenderer.invoke('gym:override', date, value),
  setGymDone: (date, done) => ipcRenderer.invoke('gym:done', date, done),
  addGymSet: (input) => ipcRenderer.invoke('gym:add-set', input),
  deleteGymSet: (id) => ipcRenderer.invoke('gym:delete-set', id),
  setWeighIn: (date, kg) => ipcRenderer.invoke('gym:weigh-in', date, kg)
}

contextBridge.exposeInMainWorld('shima', api)
