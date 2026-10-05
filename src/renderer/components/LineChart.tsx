import { linePoints } from '../lib/chartMath'

interface Props {
  values: (number | null)[]
  dots?: (number | null)[]
  min?: number
  max?: number
}

export function LineChart({ values, dots, min = 0, max = 100 }: Props) {
  const segments = linePoints(values, 200, 70, max, min)
  const points = dots ? linePoints(dots, 200, 70, max, min).flat() : []
  return (
    <svg viewBox="0 0 200 76" className="w-full" role="img" aria-label="line chart">
      {[0, 35, 70].map((y) => (
        <line key={y} x1="0" x2="200" y1={y} y2={y} stroke="rgb(243 233 214 / 0.14)" />
      ))}
      {points.map((p, i) => (
        <circle key={`dot${i}`} cx={p[0]} cy={p[1]} r="1.5" fill="#A9A08F" />
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
