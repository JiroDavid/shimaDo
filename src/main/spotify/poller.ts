import { IDLE_POLL_MS, NOW_PLAYING_MS, type NowPlaying } from '../../shared/spotify'
import { AuthLostError, SpotifyApiError } from './api'

interface Deps {
  fetchNow(): Promise<NowPlaying | null>
  onUpdate(np: NowPlaying | null, offline: boolean): void
  onAuthLost(): void
}

export class NowPlayingPoller {
  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private generation = 0
  private last: NowPlaying | null = null

  constructor(private deps: Deps) {}

  start(): void {
    if (this.running) return
    this.running = true
    void this.tick(++this.generation)
  }

  stop(): void {
    this.running = false
    this.generation++
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private async tick(generation: number): Promise<void> {
    let next = IDLE_POLL_MS
    try {
      const np = await this.deps.fetchNow()
      if (generation !== this.generation) return
      this.last = np
      this.deps.onUpdate(np, false)
      if (np?.playing) next = NOW_PLAYING_MS
    } catch (e) {
      if (generation !== this.generation) return
      if (e instanceof AuthLostError) {
        this.stop()
        this.deps.onAuthLost()
        return
      }
      if (e instanceof SpotifyApiError && e.retryAfterMs) next = e.retryAfterMs
      else this.deps.onUpdate(this.last, true)
    }
    this.timer = setTimeout(() => void this.tick(generation), next)
  }
}
