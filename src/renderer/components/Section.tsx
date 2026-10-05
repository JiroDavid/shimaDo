import type { ReactNode } from 'react'

interface Props {
  label: string
  count?: string | number
  className?: string
  children: ReactNode
}

export function Section({ label, count, className = '', children }: Props) {
  return (
    <section className={`card ${className}`}>
      <div className="card-label">
        <span>{label}</span>
        {count !== undefined && <span className="card-count">{count}</span>}
      </div>
      {children}
    </section>
  )
}
