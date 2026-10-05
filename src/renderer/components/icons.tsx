import type { ReactNode } from 'react'

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
export const NicotineIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M6 6l12 12M7 13h5M14 13h3" />
  </Icon>
)
export const SettingsIcon = () => (
  <Icon>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Icon>
)
export const PowerIcon = () => (
  <Icon>
    <path d="M12 3v9M6.3 7.3a8 8 0 1 0 11.4 0" />
  </Icon>
)
