import type { ReactNode } from 'react'
import type { HabitIconId } from '../../shared/habits'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const ProfileIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
  </Icon>
)
export const ChecklistIcon = () => (
  <Icon>
    <path d="M4 6l2 2 3-3M4 14l2 2 3-3M12 7h8M12 15h8" />
  </Icon>
)
export const ScheduleIcon = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="16" rx="1" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icon>
)
export const DumbbellIcon = () => (
  <Icon>
    <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
  </Icon>
)
export const ProgressIcon = () => (
  <Icon>
    <path d="M4 20V4M4 20h16M8 15l4-4 3 3 5-6" />
  </Icon>
)
export const HabitsIcon = () => (
  <Icon>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <path d="M14 17l2 2 4-4" />
  </Icon>
)

const HABIT_PATHS: Record<HabitIconId, ReactNode> = {
  check: <path d="M5 12l4.5 4.5L19 7" />,
  ban: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M6 6l12 12" />
    </>
  ),
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
  book: <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4zM5 17a3 3 0 0 1 3-3h10" />,
  drop: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  bolt: <path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" />,
  leaf: <path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19l7-7" />,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" />,
  coffee: <path d="M5 9h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V9zM16 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3" />,
  flame: <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z" />
}

export const HabitIcon = ({ id }: { id: HabitIconId }) => <Icon>{HABIT_PATHS[id]}</Icon>
export const NotepadIcon = () => (
  <Icon>
    <path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h3" />
  </Icon>
)
export const EditIcon = () => (
  <Icon>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />
  </Icon>
)
export const FocusIcon = () => (
  <Icon>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2M9 3h6" />
  </Icon>
)
export const SettingsIcon = () => (
  <Icon>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Icon>
)
export const MinimizeIcon = () => (
  <Icon>
    <path d="M5 12h14" />
  </Icon>
)
export const PowerIcon = () => (
  <Icon>
    <path d="M12 3v9M6.3 7.3a8 8 0 1 0 11.4 0" />
  </Icon>
)
