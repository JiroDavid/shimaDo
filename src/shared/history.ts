export const HISTORY_LIMIT = 100
export const COALESCE_MS = 300

export interface History<T> {
  past: T[]
  present: T
  future: T[]
  lastKey: string | null
  lastAt: number
}

export const createHistory = <T>(initial: T): History<T> => ({ past: [], present: initial, future: [], lastKey: null, lastAt: 0 })

export function record<T>(h: History<T>, next: T, key: string, now: number): History<T> {
  if (h.lastKey === key && now - h.lastAt <= COALESCE_MS) return { ...h, present: next, future: [], lastAt: now }
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [], lastKey: key, lastAt: now }
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], lastKey: null, lastAt: 0 }
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), lastKey: null, lastAt: 0 }
}

export const canUndo = <T>(h: History<T>): boolean => h.past.length > 0
export const canRedo = <T>(h: History<T>): boolean => h.future.length > 0
