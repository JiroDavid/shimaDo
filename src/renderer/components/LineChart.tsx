import { linePoints } from '../lib/chartMath'

export function LineChart({ values }: { values: (number | null)[] }) {
  const segments = linePoints(values, 200, 70, 100)
  return (
    <svg viewBox="0 0 200 76" className="w-full" role="img" aria-label="line chart">
      {[0, 35, 70].map((y) => (
        <line key={y} x1="0" x2="200" y1={y} y2={y} stroke="#22211c" />
      ))}
      {segments.map((seg, i) =>
        seg.length === 1 ? (
          <circle key={i} cx={seg[0][0]} cy={seg[0][1]} r="2" fill="var(--accent)" />
        ) : (
          <polyline key={i} points={seg.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        )
      )}
    </svg>
  )
}
