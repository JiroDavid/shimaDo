export function barHeights(values: number[], height: number, max?: number): number[] {
  const top = Math.max(max ?? 0, ...values) || 1
  return values.map((v) => Math.round((Math.max(v, 0) / top) * height))
}

export function linePoints(values: (number | null)[], width: number, height: number, max = 100, min = 0): [number, number][][] {
  const span = max - min || 1
  const segments: [number, number][][] = []
  let current: [number, number][] = []
  values.forEach((v, i) => {
    if (v === null) {
      if (current.length) segments.push(current)
      current = []
      return
    }
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width
    const y = height - ((Math.min(Math.max(v, min), max) - min) / span) * height
    current.push([x, y])
  })
  if (current.length) segments.push(current)
  return segments
}

export function labelStep(labels: string[], slot: number): number {
  const longest = Math.max(0, ...labels.map((l) => l.length))
  return Math.max(1, Math.ceil((longest * 5.5) / slot))
}
