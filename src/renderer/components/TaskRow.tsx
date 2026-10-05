import type { ReactNode } from 'react'
import { TAG_LABELS, type Occurrence, type TaskTag } from '../../shared/types'

export const TAG_COLOR: Record<TaskTag, string> = { urgent: 'var(--urgent)', must: 'var(--must)', important: 'var(--important)' }

export function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button role="checkbox" aria-checked={checked} aria-label={label} onClick={onChange} className="check">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </button>
  )
}

export function TagPill({ tag }: { tag: TaskTag }) {
  return <span className={`tag tag-${tag}`}>{TAG_LABELS[tag]}</span>
}

interface Props {
  occ: Occurrence
  overdue?: boolean
  showDate?: boolean
  onToggle: () => void
  actions?: ReactNode
}

const KIND_LABEL = { once: '', daily: 'daily', weekly: 'weekly' } as const

export function TaskRow({ occ, overdue, showDate, onToggle, actions }: Props) {
  const { task, done } = occ
  const kind = KIND_LABEL[task.kind]
  return (
    <div className="task-row" style={task.tag ? { ['--edge' as string]: TAG_COLOR[task.tag] } : undefined}>
      <Check checked={done} onChange={onToggle} label={task.title} />
      <div className="min-w-0 flex-1">
        <span className="task-title" data-done={done} style={overdue && !done ? { color: 'var(--urgent)' } : undefined}>
          {task.title}
        </span>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {task.time && <span className="time-pill">{task.time}</span>}
          {showDate && <span className="time-pill">{occ.date}</span>}
          {kind && <span className="text-[0.8rem] font-bold text-muted">{kind}</span>}
          {task.tag && <TagPill tag={task.tag} />}
        </div>
      </div>
      {actions}
    </div>
  )
}
