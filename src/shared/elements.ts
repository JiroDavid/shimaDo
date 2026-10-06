import type { PanelId } from './types'

export type EditableProp = 'color' | 'background' | 'border' | 'radius' | 'font' | 'text'

export interface GroupDef {
  id: string
  name: string
  selector: string
  rest?: string
  props: EditableProp[]
}

export interface ElementDef {
  id: string
  name: string
  panel: PanelId
  group?: string
  props: EditableProp[]
  defaultText?: string
}

export const GROUP_PREFIX = 'group:'
export const ID_PATTERN = /^[a-z0-9.-]+$/

const SURFACE: EditableProp[] = ['background', 'border', 'radius']
const TEXT: EditableProp[] = ['color', 'font']
const ALL: EditableProp[] = ['color', 'background', 'border', 'radius', 'font']

export const GROUPS: GroupDef[] = [
  { id: 'panel', name: 'Panel windows', selector: '.panel', props: SURFACE },
  { id: 'panel-title', name: 'Panel titles', selector: '.panel-title', props: TEXT },
  { id: 'card', name: 'Cards', selector: '.card', props: ['color', ...SURFACE] },
  { id: 'card-label', name: 'Card headings', selector: '.card-label', props: TEXT },
  { id: 'button', name: 'Buttons', selector: '.btn', rest: ':where(:not(.btn-active, .btn-danger))', props: ALL },
  { id: 'button-primary', name: 'Primary buttons', selector: '.btn-primary', props: ALL },
  { id: 'field', name: 'Text fields', selector: '.field', props: ALL },
  { id: 'tag', name: 'Tags', selector: '.tag', props: ['color', 'border', 'radius', 'font'] },
  { id: 'time-pill', name: 'Time pills', selector: '.time-pill', props: ['color', 'background', 'radius', 'font'] },
  { id: 'task-row', name: 'Task rows', selector: '.task-row', props: SURFACE },
  { id: 'task-title', name: 'Task titles', selector: '.task-title', rest: ":where(:not([data-done='true']))", props: TEXT },
  { id: 'check', name: 'Tick boxes', selector: '.check', rest: ":where(:not([aria-checked='true']))", props: SURFACE },
  { id: 'switch', name: 'Switches', selector: '.switch', rest: ":where(:not([aria-checked='true']))", props: ['background', 'border'] },
  { id: 'bar-button', name: 'Bar buttons', selector: '.bar-btn', props: ['color', 'background', 'border', 'radius'] }
]

export const EDITABLE_PANELS = ['checklist', 'schedule', 'gym', 'progress', 'habits', 'focus', 'notepad', 'welcome', 'settings', 'profile', 'confirm'] as const
export type EditablePanel = (typeof EDITABLE_PANELS)[number]

export const PANEL_TITLES: Record<EditablePanel, string> = {
  checklist: 'checklist',
  schedule: 'schedule',
  gym: 'gym',
  progress: 'progress',
  habits: 'habits',
  focus: 'focus',
  notepad: 'notepad',
  welcome: 'welcome',
  settings: 'settings',
  profile: 'profile',
  confirm: 'exit'
}

const PANEL_NAMES: Record<EditablePanel, string> = {
  checklist: 'Checklist',
  schedule: 'Schedule',
  gym: 'Gym',
  progress: 'Progress',
  habits: 'Habits',
  focus: 'Focus',
  notepad: 'Notepad',
  welcome: 'Welcome',
  settings: 'Settings',
  profile: 'Profile',
  confirm: 'Exit prompt'
}

export const BAR_BUTTONS = ['checklist', 'schedule', 'gym', 'progress', 'habits', 'focus', 'notepad', 'settings'] as const

const BAR_BUTTON_NAMES: Record<string, string> = {
  checklist: 'Checklist',
  schedule: 'Schedule',
  gym: 'Gym',
  progress: 'Progress',
  habits: 'Habits',
  focus: 'Focus',
  notepad: 'Notepad',
  settings: 'Settings',
  edit: 'Edit',
  minimize: 'Minimise'
}

export const isSurfaceKey = (key: string): boolean => key === `${GROUP_PREFIX}panel` || key === 'bar.surface' || key.endsWith('.panel')

export const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export const CARD_LABELS: Partial<Record<EditablePanel, string[]>> = {
  checklist: ['Overdue', 'To do', 'Done'],
  profile: ['About you'],
  gym: ['Consistency', 'Weight'],
  progress: ['Consistency', 'Tasks done'],
  focus: ['Today by task', 'Pomodoros per day'],
  settings: ['Theme', 'Look', 'Behaviour', 'Monitors', 'Backup', 'Layout'],
  habits: ['Tick off each day', 'Days per week']
}

const cardElements: ElementDef[] = (Object.entries(CARD_LABELS) as [EditablePanel, string[]][]).flatMap(([p, labels]) =>
  labels.map((label) => ({
    id: `${p}.card.${slug(label)}`,
    name: `${PANEL_NAMES[p]} card: ${label}`,
    panel: p,
    group: 'card',
    props: ['color', ...SURFACE] as EditableProp[]
  }))
)

export const CARD_IDS: string[] = cardElements.map((e) => e.id)

const BUTTONS: [string, string, EditablePanel, string][] = [
  ['checklist.add', 'Checklist add button', 'checklist', 'button-primary'],
  ['schedule.add-task', 'Schedule add task button', 'schedule', 'button-primary'],
  ['gym.split', 'Gym split button', 'gym', 'button-primary'],
  ['focus.start', 'Focus start button', 'focus', 'button-primary'],
  ['habits.edit', 'Habits edit button', 'habits', 'button'],
  ['profile.save', 'Profile save button', 'profile', 'button-primary'],
  ['welcome.next', 'Welcome next button', 'welcome', 'button-primary'],
  ['settings.export', 'Settings export button', 'settings', 'button'],
  ['settings.import', 'Settings import button', 'settings', 'button'],
  ['settings.reset-layout', 'Settings reset layout button', 'settings', 'button']
]

const buttonElements: ElementDef[] = BUTTONS.map(([id, name, panel, group]) => ({ id, name, panel, group, props: ALL }))

export const isEditablePanel = (id: string): id is EditablePanel => (EDITABLE_PANELS as readonly string[]).includes(id)

const panelElements: ElementDef[] = EDITABLE_PANELS.flatMap((p) => [
  { id: `${p}.panel`, name: `${PANEL_NAMES[p]} window`, panel: p, group: 'panel', props: SURFACE },
  { id: `${p}.title`, name: `${PANEL_NAMES[p]} title`, panel: p, group: 'panel-title', props: [...TEXT, 'text'] as EditableProp[], defaultText: PANEL_TITLES[p] }
])

export const ELEMENTS: ElementDef[] = [
  ...panelElements,
  ...cardElements,
  ...buttonElements,
  { id: 'bar.surface', name: 'Bar', panel: 'bar', props: SURFACE },
  { id: 'bar.avatar', name: 'Bar profile picture', panel: 'bar', props: ['background', 'border', 'radius'] },
  { id: 'bar.label', name: 'Bar label', panel: 'bar', props: ['color', 'font', 'text'], defaultText: 'To-do' },
  ...[...BAR_BUTTONS, 'edit', 'minimize'].map((id) => ({
    id: `bar.btn.${id}`,
    name: `Bar button: ${BAR_BUTTON_NAMES[id]}`,
    panel: 'bar' as const,
    group: 'bar-button',
    props: ['color', 'background', 'border', 'radius'] as EditableProp[]
  })),
  { id: 'bar.exit', name: 'Bar exit button', panel: 'bar', group: 'bar-button', props: ['color', 'background', 'border', 'radius'] },
  { id: 'checklist.heading', name: 'Checklist heading', panel: 'checklist', props: ['color', 'font', 'text'], defaultText: 'Things to do today' },
  { id: 'checklist.date', name: 'Checklist date', panel: 'checklist', props: TEXT },
  { id: 'schedule.month', name: 'Schedule month title', panel: 'schedule', props: TEXT },
  { id: 'habits.streak', name: 'Habit streak number', panel: 'habits', props: TEXT },
  { id: 'focus.clock', name: 'Focus timer clock', panel: 'focus', props: TEXT },
  { id: 'notepad.text', name: 'Notepad text area', panel: 'notepad', props: ALL },
  { id: 'gym.heading', name: 'Gym day heading', panel: 'gym', props: TEXT }
]

const byId = new Map(ELEMENTS.map((e) => [e.id, e]))
const groupsById = new Map(GROUPS.map((g) => [g.id, g]))

export const elementById = (id: string): ElementDef | undefined => byId.get(id)

export const isMovableKey = (key: string): boolean => {
  const def = byId.get(key)
  return def !== undefined && !def.id.endsWith('.panel') && def.id !== 'bar.surface'
}
export const groupById = (id: string): GroupDef | undefined => groupsById.get(id)

export function labelFor(key: string): string {
  if (key.startsWith(GROUP_PREFIX)) {
    const g = groupsById.get(key.slice(GROUP_PREFIX.length))
    return g ? `${g.name} (all)` : ''
  }
  return byId.get(key)?.name ?? ''
}

export function isKnownKey(key: string): boolean {
  if (typeof key !== 'string') return false
  return key.startsWith(GROUP_PREFIX) ? groupsById.has(key.slice(GROUP_PREFIX.length)) : byId.has(key)
}
