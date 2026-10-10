import { useContext, useLayoutEffect, useRef, type ReactNode } from 'react'
import type { AppData, PanelId } from '../../shared/types'
import { ChecklistIcon, DumbbellIcon, EditIcon, FocusIcon, MinimizeIcon, NotepadIcon, HabitsIcon, PowerIcon, ProfileIcon, ProgressIcon, ScheduleIcon, SettingsIcon, SpotifyIcon } from '../components/icons'
import { DesignContext, EditableText } from '../components/EditableText'
import { snapshotElement } from '../lib/snapshotElement'
import { isLayered } from '../../shared/layers'
import { PlacedLayer, hasUnder } from '../components/PlacedLayer'
import { ResizeHandles } from '../components/ResizeHandles'
import { useEditState } from '../hooks/useEditState'
import { useAvatar } from '../hooks/useData'

const NATURAL_W = 740
const NATURAL_H = 56

const BUTTONS: { id: PanelId; label: string; icon: ReactNode }[] = [
  { id: 'checklist', label: 'Checklist', icon: <ChecklistIcon /> },
  { id: 'schedule', label: 'Schedule', icon: <ScheduleIcon /> },
  { id: 'gym', label: 'Gym', icon: <DumbbellIcon /> },
  { id: 'progress', label: 'Progress', icon: <ProgressIcon /> },
  { id: 'habits', label: 'Habits', icon: <HabitsIcon /> },
  { id: 'focus', label: 'Focus', icon: <FocusIcon /> },
  { id: 'notepad', label: 'Notepad', icon: <NotepadIcon /> },
  { id: 'spotify', label: 'Spotify', icon: <SpotifyIcon /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon /> }
]

export function Bar({ data }: { data: AppData }) {
  const design = useContext(DesignContext)
  const layered = isLayered(design, 'bar')
  const under = hasUnder(design.stickers, 'bar')
  const avatar = useAvatar(data.profile)
  const edit = useEditState()
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
      <div ref={inner} className={`bar titlebar${layered ? ' has-layers' : ''}${under ? ' has-under' : ''}`} data-el="bar.surface">
      <PlacedLayer panel="bar" part="under" />
      <PlacedLayer panel="bar" part="back" />
      <button className="bar-avatar no-drag" data-el="bar.avatar" data-active={profileOpen} aria-label="Profile" aria-pressed={profileOpen} onClick={() => window.shima.togglePanel('profile')}>
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <ProfileIcon />}
      </button>
      <span className="heading text-accent shrink-0 whitespace-nowrap px-2 text-[1.5rem] tracking-wider" data-el="bar.label">
        <EditableText id="bar.label" fallback="To-do" />
      </span>
      <span className="bar-sep" />
      {BUTTONS.map((b) => {
        const open = data.settings.panels[b.id].visible
        return (
          <button key={b.id} className="bar-btn no-drag" data-el={`bar.btn.${b.id}`} data-active={open} aria-label={b.label} aria-pressed={open} onClick={() => window.shima.togglePanel(b.id)}>
            {b.icon}
            <span className="bar-label">{b.label}</span>
          </button>
        )
      })}
      <button
        className="bar-btn no-drag ml-auto"
        data-el="bar.btn.edit"
        data-edit-exempt
        data-active={edit.active}
        aria-pressed={edit.active}
        aria-label="Edit mode"
        onClick={(e) => {
          if (edit.active && e.shiftKey) {
            document.querySelectorAll('[data-edit-selected]').forEach((n) => n.removeAttribute('data-edit-selected'))
            e.currentTarget.setAttribute('data-edit-selected', '')
            window.shima.editSelect([{ id: 'bar.btn.edit', panel: 'bar', computed: snapshotElement(e.currentTarget) }])
            return
          }
          window.shima.setEditActive(!edit.active)
        }}
      >
        <EditIcon />
        <span className="bar-label">Edit</span>
      </button>
      <button className="bar-btn no-drag" data-el="bar.btn.minimize" aria-label="Minimise to icon" onClick={() => window.shima.minimizeAll()}>
        <MinimizeIcon />
        <span className="bar-label">Minimise</span>
      </button>
      <button className="bar-btn bar-exit no-drag" data-el="bar.exit" aria-label="Exit ShimaDo" onClick={() => window.shima.requestExit()}>
        <PowerIcon />
        <span className="bar-label">Exit</span>
      </button>
      <PlacedLayer panel="bar" part="front" />
      </div>
      <ResizeHandles id="bar" edge={6} corner={14} />
    </div>
  )
}
