import { useState } from 'react'
import type { AppData } from '../../shared/types'
import { Charts } from './gym/Charts'
import { Split } from './gym/Split'
import { Week } from './gym/Week'

const TABS = ['week', 'split', 'charts'] as const
type Tab = (typeof TABS)[number]

export function Gym({ data }: { data: AppData }) {
  const [tab, setTab] = useState<Tab>('week')
  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn flex-1 ${tab === t ? 'border-accent text-accent' : ''}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'week' && <Week data={data} />}
      {tab === 'split' && <Split data={data} onSaved={() => setTab('week')} />}
      {tab === 'charts' && <Charts data={data} />}
    </div>
  )
}
