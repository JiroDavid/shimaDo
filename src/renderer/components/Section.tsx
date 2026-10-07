import { useContext, type ReactNode } from 'react'
import { elementById, slug } from '../../shared/elements'
import { PanelContext } from './PanelContext'

interface Props {
  label: string
  count?: string | number
  className?: string
  children: ReactNode
}

export function Section({ label, count, className = '', children }: Props) {
  const panel = useContext(PanelContext)
  const id = panel ? `${panel}.card.${slug(label)}` : undefined
  return (
    <section className={`card ${className}`} data-el={id && elementById(id) ? id : undefined}>
      <div className="card-label">
        <span>{label}</span>
        {count !== undefined && <span className="card-count">{count}</span>}
      </div>
      <div className="card-body">{children}</div>
    </section>
  )
}
