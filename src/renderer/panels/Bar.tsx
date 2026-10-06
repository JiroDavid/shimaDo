import { useLayoutEffect, useRef, type ReactNode } from 'react'
import type { AppData, PanelId } from '../../shared/types'
import { ChecklistIcon, DumbbellIcon, FocusIcon, MinimizeIcon, HabitsIcon, PowerIcon, ProfileIcon, ProgressIcon, ScheduleIcon, SettingsIcon } from '../components/icons'
import { ResizeHandles } from '../components/ResizeHandles'
import { useAvatar } from '../hooks/useData'

const NATURAL_W = 640
const NATURAL_H = 56

const BUTTONS: { id: PanelId; label: string; icon: ReactNode }[] = [
  { id: 'checklist', label: 'Checklist', icon: <ChecklistIcon /> },
  { id: 'schedule', label: 'Schedule', icon: <ScheduleIcon /> },
  { id: 'gym', label: 'Gym', icon: <DumbbellIcon /> },
  { id: 'progress', label: 'Progress', icon: <ProgressIcon /> },
  { id: 'habits', label: 'Habits', icon: <HabitsIcon /> },
  { id: 'focus', label: 'Focus', icon: <FocusIcon /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon /> }
]

export function Bar({ data }: { data: AppData }) {
  const avatar = useAvatar(data.profile)
  const profileOpen = data.settings.panels.profile.visible
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return
    const apply = () => {
      const w = o.clientWidth
      const h = o.clientHeight
      if (w <= 0 || h <= 0) return
      const k = Math.min(Math.max(Math.min(w / NATURAL_W, h / NATURAL_H), 0.45), 2.2)
      i.style.zoom = String(k)
      i.style.width = `${w / k}px`
      i.style.height = `${h / k}px`
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(o)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={outer} className="relative h-full w-full">
      <div ref={inner} className="bar titlebar">
      <button className="bar-avatar no-drag" data-active={profileOpen} aria-label="Profile" aria-pressed={profileOpen} onClick={() => window.shima.togglePanel('profile')}>
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <ProfileIcon />}
      </button>
      <span className="heading text-accent shrink-0 whitespace-nowrap px-2 text-[1.5rem] tracking-wider">To-do</span>
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
      <button className="bar-btn no-drag ml-auto" aria-label="Minimise to icon" onClick={() => window.shima.minimizeAll()}>
        <MinimizeIcon />
        <span className="bar-label">Minimise</span>
      </button>
      <button className="bar-btn bar-exit no-drag" aria-label="Exit ShimaDo" onClick={() => window.shima.requestExit()}>
        <PowerIcon />
        <span className="bar-label">Exit</span>
      </button>
      </div>
      <ResizeHandles id="bar" edge={6} corner={14} />
    </div>
  )
}
