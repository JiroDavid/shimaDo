import type { ReactNode } from 'react'
import type { Occurrence } from '../../shared/types'

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
  const tone = done ? 'text-muted line-through' : overdue ? 'text-brick' : 'text-cream'
  const kind = KIND_LABEL[task.kind]
  return (
    <div className="flex items-start gap-2 border-b border-dark-border py-1.5">
      <button
        role="checkbox"
        aria-checked={done}
        onClick={onToggle}
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border text-[10px] leading-none ${
          done ? 'border-sage bg-sage text-dark' : 'border-muted'
        }`}
      >
        {done ? '✓' : ''}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`break-words ${tone}`}>{task.title}</div>
        <div className="text-[10px] text-muted">
          {showDate ? `${occ.date}  ` : ''}
          {task.time || 'any time'}
          {kind ? `  ${kind}` : ''}
        </div>
      </div>
      {actions}
    </div>
  )
}
