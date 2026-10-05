import { dueBetween, type Schedule } from '../shared/recurrence'
import type { AppData, Occurrence } from '../shared/types'

export const TICK_MS = 30_000
export const MAX_GAP_MS = TICK_MS * 3

export function due(data: Schedule, fromMs: number, toMs: number): Occurrence[] {
  if (toMs - fromMs > MAX_GAP_MS) return []
  return dueBetween(data, fromMs, toMs)
}

export function startScheduler(store: { data: AppData }, onDue: (o: Occurrence) => void): () => void {
  let last = Date.now()
  const timer = setInterval(() => {
    const now = Date.now()
    for (const occ of due(store.data, last, now)) onDue(occ)
    last = now
  }, TICK_MS)
  return () => clearInterval(timer)
}
