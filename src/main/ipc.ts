import { ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import { PANEL_IDS, type BackupResult, type Edge, type GymDay, type HabitInput, type PanelId, type ProfileInput, type SettingsPatch, type TaskInput, type TimerAction } from '../shared/types'
import { toDateKey } from '../shared/dates'
import {
  addHabit, addTask, deleteHabit, deleteTask, sanitizeSettingsPatch, setDone, setGymDone, setGymOverride,
  setHabitDay, setNotes, setProfile, setSplit, setWeighIn, updateHabit, updateTask
} from './mutations'
import type { PomodoroTimer } from './timer'
import type { PanelManager } from './panels'
import type { Store } from './store'

const EDGES: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

const isPanelId = (v: unknown): v is PanelId => PANEL_IDS.includes(v as PanelId)

export interface AppActions {
  changeSettings(patch: SettingsPatch): void
  confirmExit(): void
  pickAvatar(): Promise<string | null>
  readAvatar(): string | null
  exportBackup(): Promise<BackupResult>
  importBackup(): Promise<BackupResult>
}

const TIMER_ACTIONS: TimerAction[] = ['start', 'pause', 'reset', 'skip']

export function registerIpc(store: Store, panels: PanelManager, timer: PomodoroTimer, actions: AppActions): void {
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
  ipcMain.handle('notes:set', (_e, text: string) => {
    store.update((d) => setNotes(d, text))
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
  ipcMain.handle('backup:export', () => actions.exportBackup())
  ipcMain.handle('backup:import', () => actions.importBackup())

  ipcMain.handle('settings:set', (_e, raw: unknown) => actions.changeSettings(sanitizeSettingsPatch(raw)))
  ipcMain.handle('app:exit', () => panels.show('confirm'))
  ipcMain.handle('app:confirm-exit', () => actions.confirmExit())
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
  ipcMain.on('panel:hide', (_e, id: unknown) => {
    if (isPanelId(id)) panels.hide(id)
  })
}
