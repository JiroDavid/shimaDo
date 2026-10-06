import { useEffect } from 'react'
import type { PanelId } from '../shared/types'
import { PanelFrame } from './components/PanelFrame'
import { useData } from './hooks/useData'
import { Bar } from './panels/Bar'
import { Checklist } from './panels/Checklist'
import { Confirm } from './panels/Confirm'
import { Focus } from './panels/Focus'
import { Gym } from './panels/Gym'
import { Mini } from './panels/Mini'
import { Habits } from './panels/Habits'
import { Notepad } from './panels/Notepad'
import { Profile } from './panels/Profile'
import { Progress } from './panels/Progress'
import { Schedule } from './panels/Schedule'
import { Settings } from './panels/Settings'

const TITLES: Record<PanelId, string> = {
  bar: 'to-do',
  checklist: 'checklist',
  schedule: 'schedule',
  gym: 'gym',
  progress: 'progress',
  habits: 'habits',
  focus: 'focus',
  notepad: 'notepad',
  settings: 'settings',
  profile: 'profile',
  confirm: 'exit',
  mini: 'shimado'
}

const FIT: Partial<Record<PanelId, 'both'>> = { progress: 'both', habits: 'both', focus: 'both', settings: 'both', profile: 'both', confirm: 'both' }

const NOTEPAD_NATURAL_WIDTH = 200

function currentPanel(): PanelId {
  const id = location.hash.replace(/^#\/?/, '')
  return id in TITLES ? (id as PanelId) : 'checklist'
}

export function App() {
  const data = useData()
  const id = currentPanel()

  useEffect(() => {
    if (!data) return
    document.documentElement.dataset.accent = data.settings.accent
    document.documentElement.style.setProperty('--panel-alpha', String(data.settings.opacity))
  }, [data])

  if (!data) return null
  if (id === 'bar') return <Bar data={data} />
  if (id === 'mini') return <Mini />

  return (
    <PanelFrame id={id} title={TITLES[id]} fit={FIT[id] ?? 'width'} naturalWidth={id === 'notepad' ? NOTEPAD_NATURAL_WIDTH : undefined}>
      {id === 'checklist' && <Checklist data={data} />}
      {id === 'schedule' && <Schedule data={data} />}
      {id === 'gym' && <Gym data={data} />}
      {id === 'progress' && <Progress data={data} />}
      {id === 'habits' && <Habits data={data} />}
      {id === 'focus' && <Focus data={data} />}
      {id === 'notepad' && <Notepad data={data} />}
      {id === 'settings' && <Settings data={data} />}
      {id === 'profile' && <Profile data={data} />}
      {id === 'confirm' && <Confirm />}
    </PanelFrame>
  )
}
