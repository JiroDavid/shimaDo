export function barHeights(values: number[], height: number, max?: number): number[] {
  const top = Math.max(max ?? 0, ...values) || 1
  return values.map((v) => Math.round((Math.max(v, 0) / top) * height))
}

export function linePoints(values: (number | null)[], width: number, height: number, max = 100): [number, number][][] {
  const segments: [number, number][][] = []
  let current: [number, number][] = []
  values.forEach((v, i) => {
    if (v === null) {
      if (current.length) segments.push(current)
      current = []
      return
    }
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width
    const y = height - (Math.min(Math.max(v, 0), max) / max) * height
    current.push([x, y])
  })
  if (current.length) segments.push(current)
  return segments
}
