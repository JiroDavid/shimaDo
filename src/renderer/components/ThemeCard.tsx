import type { CSSProperties } from 'react'
import { themeVars, type Theme } from '../../shared/theme'

interface Props {
  theme: Theme
  accent: string
  selected: boolean
  onSelect: () => void
}

export function ThemeCard({ theme, accent, selected, onSelect }: Props) {
  const vars = themeVars(theme, accent, 1) as CSSProperties
  return (
    <button
      role="radio"
      aria-checked={selected}
      aria-label={theme.name}
      onClick={onSelect}
      className={`rounded-2xl border-2 p-1.5 text-left transition hover:border-accent ${selected ? 'border-accent' : 'border-line'}`}
    >
      <div
        style={{
          ...vars,
          background: 'var(--panel-solid)',
          color: 'var(--text)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius-card)',
          fontFamily: 'var(--font-body)',
          padding: 8
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--urgent)' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{theme.name}</span>
        </div>
        {[true, false].map((on) => (
          <div key={String(on)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 4,
                border: '2px solid var(--line-strong)',
                background: on ? 'var(--accent)' : 'transparent',
                borderColor: on ? 'var(--accent)' : 'var(--line-strong)'
              }}
            />
            <span style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--muted)', opacity: on ? 0.45 : 0.8 }} />
          </div>
        ))}
        <div style={{ display: 'flex', marginTop: 8 }}>
          <span
            style={{
              padding: '2px 10px',
              borderRadius: 'min(var(--radius-control), 12px)',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              fontSize: 10,
              fontWeight: 800
            }}
          >
            Add
          </span>
        </div>
      </div>
    </button>
  )
}
