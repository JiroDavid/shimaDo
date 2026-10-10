const DECAY = 0.85

export function spectrumBars(freq: Uint8Array, count: number, previous: number[] | null): number[] {
  const bins = freq.length
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const lo = Math.floor(Math.pow(Math.max(bins, 1), i / count))
    const hi = Math.max(lo + 1, Math.floor(Math.pow(Math.max(bins, 1), (i + 1) / count)))
    let sum = 0
    let n = 0
    for (let b = lo; b < hi && b < bins; b++) {
      sum += freq[b]
      n++
    }
    const level = n === 0 ? 0 : sum / n / 255
    out.push(Math.min(1, Math.max(level, (previous?.[i] ?? 0) * DECAY)))
  }
  return out
}
