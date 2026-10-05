export type Phase = 'focus' | 'short' | 'long'

export interface TimerState {
  phase: Phase
  running: boolean
  endsAt: number | null
  remainingMs: number
  cycle: number
}

export const PHASE_MS: Record<Phase, number> = {
  focus: 25 * 60_000,
  short: 5 * 60_000,
  long: 15 * 60_000
}
export const PHASE_LABELS: Record<Phase, string> = { focus: 'FOCUS', short: 'SHORT BREAK', long: 'LONG BREAK' }
export const SETS_BEFORE_LONG = 4

export function initialTimer(): TimerState {
  return { phase: 'focus', running: false, endsAt: null, remainingMs: PHASE_MS.focus, cycle: 0 }
}

export function remaining(s: TimerState, now: number): number {
  return s.running && s.endsAt !== null ? Math.max(0, s.endsAt - now) : s.remainingMs
}

export function startTimer(s: TimerState, now: number): TimerState {
  if (s.running) return s
  return { ...s, running: true, endsAt: now + s.remainingMs }
}

export function pauseTimer(s: TimerState, now: number): TimerState {
  if (!s.running) return s
  return { ...s, running: false, endsAt: null, remainingMs: remaining(s, now) }
}

export function resetTimer(s: TimerState): TimerState {
  return { ...s, running: false, endsAt: null, remainingMs: PHASE_MS[s.phase] }
}

function idleAt(phase: Phase, cycle: number): TimerState {
  return { phase, running: false, endsAt: null, remainingMs: PHASE_MS[phase], cycle }
}

function nextPhase(s: TimerState): { phase: Phase; cycle: number } {
  if (s.phase !== 'focus') return { phase: 'focus', cycle: s.phase === 'long' ? 0 : s.cycle }
  const cycle = s.cycle + 1
  return { phase: cycle >= SETS_BEFORE_LONG ? 'long' : 'short', cycle }
}

export function skipPhase(s: TimerState): TimerState {
  const n = nextPhase(s)
  return idleAt(n.phase, n.cycle)
}

export function isDue(s: TimerState, now: number): boolean {
  return s.running && s.endsAt !== null && now >= s.endsAt
}

export function finishPhase(s: TimerState, now: number): { state: TimerState; focusCompleted: boolean } {
  const n = nextPhase(s)
  const idle = idleAt(n.phase, n.cycle)
  const state = n.phase === 'focus' ? idle : startTimer(idle, now)
  return { state, focusCompleted: s.phase === 'focus' }
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
