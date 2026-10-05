import { Notification } from 'electron'
import { PHASE_LABELS, finishPhase, initialTimer, isDue, pauseTimer, resetTimer, skipPhase, startTimer, type TimerState } from '../shared/pomodoro'
import type { TimerAction } from '../shared/types'

interface Options {
  onChange: (s: TimerState) => void
  onFocusDone: () => void
  onNotifyClick: () => void
}

export class PomodoroTimer {
  state: TimerState = initialTimer()
  private handle: NodeJS.Timeout | null = null

  constructor(private opts: Options) {}

  act(action: TimerAction): void {
    const now = Date.now()
    if (action === 'start') this.state = startTimer(this.state, now)
    else if (action === 'pause') this.state = pauseTimer(this.state, now)
    else if (action === 'reset') this.state = resetTimer(this.state)
    else if (action === 'skip') this.state = skipPhase(this.state)
    this.arm()
    this.opts.onChange(this.state)
  }

  dispose(): void {
    if (this.handle) clearTimeout(this.handle)
  }

  private arm(): void {
    if (this.handle) clearTimeout(this.handle)
    this.handle = null
    if (!this.state.running || this.state.endsAt === null) return
    this.handle = setTimeout(() => this.fire(), Math.max(0, this.state.endsAt - Date.now()))
  }

  private fire(): void {
    const now = Date.now()
    if (!isDue(this.state, now)) return this.arm()
    const { state, focusCompleted } = finishPhase(this.state, now)
    this.state = state
    if (focusCompleted) this.opts.onFocusDone()
    this.arm()
    this.opts.onChange(this.state)
    const body = state.running ? `Time for a ${PHASE_LABELS[state.phase].toLowerCase()}` : 'Break over - ready to focus?'
    const n = new Notification({ title: 'ShimaDo', body })
    n.on('click', this.opts.onNotifyClick)
    n.show()
  }
}
