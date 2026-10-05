import { barHeights, labelStep } from '../lib/chartMath'

interface Props {
  values: number[]
  labels: string[]
  max?: number
  height?: number
}

export function BarChart({ values, labels, max, height = 70 }: Props) {
  const heights = barHeights(values, height, max)
  const slot = 200 / Math.max(values.length, 1)
  const step = labelStep(labels, slot)
  return (
    <svg viewBox={`0 0 200 ${height + 16}`} className="w-full" role="img" aria-label="bar chart">
      <line x1="0" x2="200" y1={height} y2={height} stroke="#22211c" />
      {heights.map((h, i) => (
        <g key={i}>
          <rect x={i * slot + slot * 0.18} y={height - h} width={slot * 0.64} height={h} fill="var(--accent)" />
          {i % step === 0 && (
            <text x={i * slot + slot / 2} y={height + 11} fontSize="8" textAnchor="middle" fill="#7a6e5a">
              {labels[i]}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
