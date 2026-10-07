import type { AssetInfo, AssetResult } from './assets'
import type { Anchor, Background, StickerDraft, StickerLayer } from './placement'
import type { Design, SelectedElement } from './design'
import type { HabitIconId } from './habits'
import type { TimerState } from './pomodoro'
import type { ZoomAction } from './zoom'

export type TaskKind = 'once' | 'daily' | 'weekly'
export type TaskTag = 'urgent' | 'must' | 'important'
export const TASK_TAGS: TaskTag[] = ['urgent', 'must', 'important']
export const TAG_LABELS: Record<TaskTag, string> = { urgent: 'URGENT', must: 'MUST DO', important: 'IMPORTANT' }
export type PanelId = 'bar' | 'checklist' | 'schedule' | 'gym' | 'progress' | 'habits' | 'focus' | 'notepad' | 'welcome' | 'designer' | 'layers' | 'settings' | 'profile' | 'confirm' | 'mini'
export const PANEL_IDS: PanelId[] = ['bar', 'checklist', 'schedule', 'gym', 'progress', 'habits', 'focus', 'notepad', 'welcome', 'designer', 'layers', 'settings', 'profile', 'confirm', 'mini']
export type TimerAction = 'start' | 'pause' | 'reset' | 'skip'
export type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface DisplayInfo {
  id: number
  label: string
  primary: boolean
  hasBar: boolean
}

export interface Task {
  id: string
  title: string
  notes?: string
  kind: TaskKind
  date?: string
  time: string
  endTime?: string
  weekdays?: number[]
  tag?: TaskTag
  createdOn: string
  archivedOn?: string
}

export interface TaskInput {
  title: string
  notes?: string
  kind: TaskKind
  date?: string
  time: string
  endTime?: string
  weekdays?: number[]
  tag?: TaskTag
}

export interface Completion {
  taskId: string
  occurrenceDate: string
  doneAt: string
}

export interface PanelState {
  x?: number
  y?: number
  width: number
  height: number
  visible: boolean
  zoom?: number
}

export interface Settings {
  opacity: number
  alwaysOnTop: boolean
  accent: string
  theme: string
  onboarded: boolean
  launchAtStartup: boolean
  textScale: number
  layoutVersion?: number
  panels: Record<PanelId, PanelState>
}

export interface GymDay {
  label: string
  exercises: string[]
}

export interface GymSplit {
  from: string
  days: (GymDay | null)[]
}

export interface Gym {
  splits: GymSplit[]
  overrides: Record<string, GymDay | null>
  done: Record<string, true>
  weighIns: Record<string, number>
}

export type SettingsPatch = Partial<Pick<Settings, 'opacity' | 'accent' | 'theme' | 'alwaysOnTop' | 'launchAtStartup' | 'textScale'>>

export interface Profile {
  username: string
  firstName: string
  dateOfBirth: string
  heightCm: number | null
  avatarUpdatedAt: number | null
}

export type ProfileInput = Omit<Profile, 'avatarUpdatedAt'>

export interface PomodoroSession {
  date: string
  endedAt: number
  task: string
}

export interface Habit {
  id: string
  name: string
  icon: HabitIconId
}

export type HabitInput = Omit<Habit, 'id'>

export interface EditState {
  active: boolean
  selected: SelectedElement[]
  canUndo: boolean
  canRedo: boolean
  dom: Record<string, string[]>
  cropping: string | null
  spaceClicks: number
}

export interface SelectRequest {
  panel: string
  ids: string[]
  additive: boolean
}

export interface HoverRequest {
  panel: string
  id: string | null
}

export interface BackupResult {
  ok: boolean
  message: string
}

export interface AppData {
  version: 1
  tasks: Task[]
  completions: Completion[]
  habits: Habit[]
  habitLog: Record<string, Record<string, true>>
  notes: string
  design: Design
  assets: Record<string, AssetInfo>
  pomodoros: Record<string, number>
  pomodoroLog: PomodoroSession[]
  profile: Profile
  gym: Gym
  settings: Settings
}

export interface Occurrence {
  task: Task
  date: string
  done: boolean
}

export interface ShimaApi {
  getTimer(): Promise<TimerState>
  onTimer(cb: (s: TimerState) => void): () => void
  timerAction(action: TimerAction): void
  setTimerTask(task: string): void
  getData(): Promise<AppData>
  onChange(cb: (d: AppData) => void): () => void
  addTask(input: TaskInput): Promise<void>
  updateTask(id: string, input: TaskInput): Promise<void>
  deleteTask(id: string): Promise<void>
  setDone(taskId: string, date: string, done: boolean): Promise<void>
  addHabit(input: HabitInput): Promise<void>
  updateHabit(id: string, input: HabitInput): Promise<void>
  deleteHabit(id: string): Promise<void>
  setHabitDay(id: string, date: string, on: boolean): Promise<void>
  setNotes(text: string): Promise<void>
  getEditState(): Promise<EditState>
  onEditState(cb: (s: EditState) => void): () => void
  setEditActive(on: boolean): void
  editSelect(selection: SelectedElement[]): void
  editSelectRequest(request: SelectRequest): void
  onSelectRequest(cb: (r: SelectRequest) => void): () => void
  editHover(request: HoverRequest): void
  onHover(cb: (r: HoverRequest) => void): () => void
  editReportDom(panel: string, ids: string[]): void
  editResizeElement(key: string, width: number | null, height: number | null, x: number, y: number): void
  floatDragBegin(id: string): void
  onFloatPreview(cb: (r: { id: string; patch: Record<string, unknown> | null }) => void): () => void
  floatGestureBegin(id: string, kind: 'resize' | 'rotate' | 'crop', handle: string, snap: boolean): void
  floatGestureEnd(id: string): void
  floatDragEnd(id: string): void
  editContextMenu(panel: string, ids: string[]): void
  editSetAnchors(updates: { id: string; anchor: Anchor | null }[]): void
  editSpaceClick(): void
  editCropMode(id: string | null): void
  editRecentColor(hex: string): void
  editPresetSave(panel: string, name: string): void
  editPresetDelete(id: string): void
  editPresetApply(id: string, panel: string): void
  editPatch(key: string, patch: Record<string, unknown>): void
  editPatchMany(keys: string[], patch: Record<string, unknown>): void
  editResetMany(keys: string[]): void
  editStickerUpdateMany(ids: string[], patch: Record<string, unknown>): void
  editUndo(): void
  editRedo(): void
  editReset(key: string): void
  editResetAll(): void
  editMove(key: string, x: number, y: number): void
  editResetPosition(key: string): void
  editStickerAdd(draft: StickerDraft): void
  editStickerUpdate(id: string, patch: Record<string, unknown>): void
  editStickerDelete(id: string): void
  editStickerDuplicate(id: string): void
  editStickerOrder(id: string, direction: 'forward' | 'back'): void
  editStickerPlace(id: string, layer: StickerLayer, aboveId: string | null): void
  editArrange(panel: string, id: string, region: 'front' | 'behind' | 'under', aboveId: string | null): void
  editBackground(key: string, bg: Background | null): void
  assetAdd(name: string, bytes: Uint8Array): Promise<AssetResult>
  assetChoose(): Promise<AssetResult[]>
  assetDelete(id: string): void
  expandPanel(id: PanelId, width: number, height: number): void
  collapsePanel(id: PanelId): void
  zoomPanel(id: PanelId, action: ZoomAction): void
  hidePanel(id: PanelId): void
  togglePanel(id: PanelId): void
  setSettings(patch: SettingsPatch): Promise<void>
  requestExit(): Promise<void>
  confirmExit(): Promise<void>
  beginResize(id: PanelId, edge: Edge): void
  endResize(): void
  listDisplays(): Promise<DisplayInfo[]>
  moveAllToDisplay(id: number): Promise<void>
  resetLayout(): Promise<void>
  minimizeAll(): void
  restoreAll(): void
  beginMove(id: PanelId): void
  endMove(): void
  setProfile(input: ProfileInput): Promise<void>
  pickAvatar(): Promise<string | null>
  getAvatar(): Promise<string | null>
  setSplit(days: (GymDay | null)[]): Promise<void>
  setGymOverride(date: string, value: GymDay | null | undefined): Promise<void>
  setGymDone(date: string, done: boolean): Promise<void>
  setWeighIn(date: string, kg: number | null): Promise<void>
  exportBackup(): Promise<BackupResult>
  importBackup(): Promise<BackupResult>
}
