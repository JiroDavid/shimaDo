import type { ReactNode } from 'react'
import type { AppData, PanelId } from '../../shared/types'
import { ChecklistIcon, DumbbellIcon, NicotineIcon, PowerIcon, ProfileIcon, ProgressIcon, ScheduleIcon, SettingsIcon } from '../components/icons'
import { useAvatar } from '../hooks/useData'

const BUTTONS: { id: PanelId; label: string; icon: ReactNode }[] = [
  { id: 'checklist', label: 'Checklist', icon: <ChecklistIcon /> },
  { id: 'schedule', label: 'Schedule', icon: <ScheduleIcon /> },
  { id: 'gym', label: 'Gym', icon: <DumbbellIcon /> },
  { id: 'progress', label: 'Progress', icon: <ProgressIcon /> },
  { id: 'nicotine', label: 'Nicotine', icon: <NicotineIcon /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon /> }
]

export function Bar({ data }: { data: AppData }) {
  const avatar = useAvatar(data.profile)
  const profileOpen = data.settings.panels.profile.visible
  return (
    <div className="bar titlebar">
      <span className="corner corner-tl" />
      <span className="corner corner-br" />
      <button className="bar-avatar no-drag" data-active={profileOpen} aria-label="Profile" aria-pressed={profileOpen} onClick={() => window.shima.togglePanel('profile')}>
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <ProfileIcon />}
      </button>
      <span className="text-accent px-2 font-bold tracking-widest">To-do</span>
      <span className="bar-sep" />
      {BUTTONS.map((b) => {
        const open = data.settings.panels[b.id].visible
        return (
          <button key={b.id} className="bar-btn no-drag" data-active={open} aria-label={b.label} aria-pressed={open} onClick={() => window.shima.togglePanel(b.id)}>
            {b.icon}
            <span className="bar-label">{b.label}</span>
          </button>
        )
      })}
      <button className="bar-btn bar-exit no-drag ml-auto" aria-label="Exit ShimaDo" onClick={() => window.shima.requestExit()}>
        <PowerIcon />
        <span className="bar-label">Exit</span>
      </button>
    </div>
  )
}
