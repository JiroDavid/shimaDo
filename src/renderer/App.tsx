import { useLayoutEffect } from 'react'
import { emptyDesign } from '../shared/design'
import { PANEL_TITLES } from '../shared/elements'
import type { PanelId } from '../shared/types'
import { PanelFrame } from './components/PanelFrame'
import { DesignContext } from './components/EditableText'
import { DropGuard } from './components/DropGuard'
import { EditLayer } from './components/EditLayer'
import { applyDesign } from './lib/applyDesign'
import { applyTheme } from './lib/applyTheme'
import { useData } from './hooks/useData'
import { Bar } from './panels/Bar'
import { Checklist } from './panels/Checklist'
import { Confirm } from './panels/Confirm'
import { Designer } from './panels/Designer'
import { Focus } from './panels/Focus'
import { Gym } from './panels/Gym'
import { Mini } from './panels/Mini'
import { Habits } from './panels/Habits'
import { Notepad } from './panels/Notepad'
import { Welcome } from './panels/Welcome'
import { Profile } from './panels/Profile'
import { Progress } from './panels/Progress'
import { Schedule } from './panels/Schedule'
import { Settings } from './panels/Settings'

const TITLES: Record<PanelId, string> = { ...PANEL_TITLES, bar: 'to-do', mini: 'shimado', designer: 'designer' }

const FIT: Partial<Record<PanelId, 'both'>> = { progress: 'both', habits: 'both', focus: 'both', profile: 'both', confirm: 'both', welcome: 'both' }

const NOTEPAD_NATURAL_WIDTH = 200

export function currentPanel(): PanelId {
  const id = location.hash.replace(/^#\/?/, '')
  return id in TITLES ? (id as PanelId) : 'checklist'
}

export function App() {
  const data = useData()
  const id = currentPanel()

  useLayoutEffect(() => {
    if (data) {
      applyTheme(data.settings)
      applyDesign(id === 'designer' ? emptyDesign() : data.design)
    }
  }, [data])

  if (!data) return null
  const body =
    id === 'bar' ? (
      <Bar data={data} />
    ) : id === 'mini' ? (
      <Mini />
    ) : (
      <PanelFrame id={id} title={TITLES[id]} fit={FIT[id] ?? 'width'} naturalWidth={id === 'notepad' ? NOTEPAD_NATURAL_WIDTH : undefined}>
        {id === 'checklist' && <Checklist data={data} />}
        {id === 'schedule' && <Schedule data={data} />}
        {id === 'gym' && <Gym data={data} />}
        {id === 'progress' && <Progress data={data} />}
        {id === 'habits' && <Habits data={data} />}
        {id === 'focus' && <Focus data={data} />}
        {id === 'notepad' && <Notepad data={data} />}
        {id === 'welcome' && <Welcome data={data} />}
        {id === 'settings' && <Settings data={data} />}
        {id === 'profile' && <Profile data={data} />}
        {id === 'confirm' && <Confirm />}
        {id === 'designer' && <Designer data={data} />}
      </PanelFrame>
    )
  return (
    <DesignContext.Provider value={data.design}>
      <DropGuard panel={id} />
      {id !== 'mini' && id !== 'designer' && <EditLayer panel={id} />}
      {body}
    </DesignContext.Provider>
  )
}
