import { ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import { PANEL_IDS, type GymDay, type PanelId, type ProfileInput, type SettingsPatch, type TaskInput } from '../shared/types'
import { toDateKey } from '../shared/dates'
import {
  addTask, deleteTask, sanitizeSettingsPatch, setDone, setGymDone, setGymOverride,
  setNicotine, setProfile, setSplit, setWeighIn, updateTask
} from './mutations'
import type { PanelManager } from './panels'
import type { Store } from './store'

const isPanelId = (v: unknown): v is PanelId => PANEL_IDS.includes(v as PanelId)

export interface AppActions {
  changeSettings(patch: SettingsPatch): void
  confirmExit(): Promise<void>
  pickAvatar(): Promise<string | null>
  readAvatar(): string | null
}

export function registerIpc(store: Store, panels: PanelManager, actions: AppActions): void {
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
  ipcMain.handle('nicotine:set', (_e, date: string, on: boolean) => {
    store.update((d) => setNicotine(d, date, on))
    commit()
  })

  ipcMain.handle('settings:set', (_e, raw: unknown) => actions.changeSettings(sanitizeSettingsPatch(raw)))
  ipcMain.handle('app:exit', () => actions.confirmExit())
  ipcMain.handle('profile:set', (_e, input: ProfileInput) => {
    store.update((d) => setProfile(d, input, today()))
    commit()
  })
  ipcMain.handle('profile:pick-avatar', () => actions.pickAvatar())
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

  ipcMain.on('panel:toggle', (_e, id: unknown) => {
    if (isPanelId(id)) panels.toggle(id)
  })
  ipcMain.on('panel:resize', (_e, id: unknown, w: number, h: number) => {
    if (isPanelId(id)) panels.setSize(id, w, h)
  })
  ipcMain.on('panel:hide', (_e, id: unknown) => {
    if (isPanelId(id)) panels.hide(id)
  })
}
