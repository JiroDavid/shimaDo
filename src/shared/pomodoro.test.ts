import { describe, it, expect } from 'vitest'
import {
  PHASE_MS, finishPhase, formatClock, initialTimer, isDue, pauseTimer, remaining, resetTimer, skipPhase, startTimer
} from './pomodoro'

describe('pomodoro timer', () => {
  it('starts, counts down and pauses', () => {
    const s = startTimer(initialTimer(), 1000)
    expect(s.endsAt).toBe(1000 + PHASE_MS.focus)
    const p = pauseTimer(s, 61_000)
    expect(p.running).toBe(false)
    expect(p.remainingMs).toBe(PHASE_MS.focus - 60_000)
    expect(remaining(startTimer(p, 100_000), 130_000)).toBe(PHASE_MS.focus - 90_000)
  })

  it('reset restores the full phase length', () => {
    const p = pauseTimer(startTimer(initialTimer(), 0), 30_000)
    expect(resetTimer(p).remainingMs).toBe(PHASE_MS.focus)
  })

  it('is due only once the end time passes', () => {
    const s = startTimer(initialTimer(), 0)
    expect(isDue(s, PHASE_MS.focus - 1)).toBe(false)
    expect(isDue(s, PHASE_MS.focus)).toBe(true)
    expect(isDue(initialTimer(), 1e12)).toBe(false)
  })

  it('finishing focus counts a pomodoro and auto-starts a short break', () => {
    const { state, focusCompleted } = finishPhase(startTimer(initialTimer(), 0), PHASE_MS.focus)
    expect(focusCompleted).toBe(true)
    expect(state).toMatchObject({ phase: 'short', running: true, cycle: 1 })
  })

  it('finishing a break waits for the user to start focus', () => {
    const brk = finishPhase(startTimer(initialTimer(), 0), 0).state
    const { state, focusCompleted } = finishPhase(brk, 1)
    expect(focusCompleted).toBe(false)
    expect(state).toMatchObject({ phase: 'focus', running: false, cycle: 1 })
  })

  it('takes a long break after four focus sessions, then restarts the set', () => {
    let s = initialTimer()
    for (let i = 0; i < 3; i++) s = skipPhase(skipPhase(s))
    expect(s.cycle).toBe(3)
    const long = skipPhase(s)
    expect(long).toMatchObject({ phase: 'long', cycle: 4 })
    expect(skipPhase(long)).toMatchObject({ phase: 'focus', cycle: 0 })
  })

  it('formats the clock rounding up', () => {
    expect(formatClock(PHASE_MS.focus)).toBe('25:00')
    expect(formatClock(59_001)).toBe('01:00')
    expect(formatClock(0)).toBe('00:00')
  })
})
