import { useEffect } from 'react'
import type { PanelId } from '../shared/types'
import { PanelFrame } from './components/PanelFrame'
import { useData } from './hooks/useData'
import { Bar } from './panels/Bar'
import { Checklist } from './panels/Checklist'
import { Confirm } from './panels/Confirm'
import { Gym } from './panels/Gym'
import { Nicotine } from './panels/Nicotine'
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
  nicotine: 'no-nicotine',
  settings: 'settings',
  profile: 'profile',
  confirm: 'exit'
}

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

  return (
    <PanelFrame id={id} title={TITLES[id]}>
      {id === 'checklist' && <Checklist data={data} />}
      {id === 'schedule' && <Schedule data={data} />}
      {id === 'gym' && <Gym data={data} />}
      {id === 'progress' && <Progress data={data} />}
      {id === 'nicotine' && <Nicotine data={data} />}
      {id === 'settings' && <Settings data={data} />}
      {id === 'profile' && <Profile data={data} />}
      {id === 'confirm' && <Confirm />}
    </PanelFrame>
  )
}
