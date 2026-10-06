import { useState } from 'react'
import type { AppData } from '../../shared/types'
import { Charts } from './gym/Charts'
import { Split } from './gym/Split'
import { Week } from './gym/Week'

const TABS = [
  { id: 'week', label: 'This week' },
  { id: 'split', label: 'My split' },
  { id: 'charts', label: 'Charts' }
] as const
type Tab = (typeof TABS)[number]['id']

export function Gym({ data }: { data: AppData }) {
  const [tab, setTab] = useState<Tab>('week')
  const hasSplit = data.gym.splits.length > 0
  return (
    <div className="space-y-4 pt-1">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`btn flex-1 !px-2 ${tab === t.id ? 'btn-active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'week' &&
        (hasSplit ? (
          <Week data={data} />
        ) : (
          <div className="card mt-6 space-y-3 text-center">
            <p className="heading text-[1.8rem]">Set up your split</p>
            <p className="text-muted">Tell ShimaDo what you train each weekday, like Chest + Tri or Back + Bi, and list your exercises.</p>
            <button className="btn btn-primary" data-el="gym.split" onClick={() => setTab('split')}>
              Set up now
            </button>
          </div>
        ))}
      {tab === 'split' && <Split data={data} onSaved={() => setTab('week')} />}
      {tab === 'charts' && <Charts data={data} />}
    </div>
  )
}
