import { HISTORY_POLL_MS, type ControlAction, type NowPlaying, type Play, type SpotifyState, type Stats, type StatsRange } from '../../shared/spotify'
import { AuthLostError, ControlError } from './api'
import { LoginCancelledError } from './auth'
import { computeStats } from './history'
import { NowPlayingPoller } from './poller'

export interface SpotifyDeps {
  clientId(): string
  auth: { connected: boolean; canControl: boolean; connect(): Promise<void>; cancel(): void; disconnect(): void }
  api: { nowPlaying(): Promise<NowPlaying | null>; recentlyPlayed(): Promise<Play[]>; control(action: ControlAction): Promise<void> }
  history: { add(plays: Play[]): number; plays: Play[] }
  broadcast(s: SpotifyState): void
}

export class SpotifyController {
  private nowPlaying: NowPlaying | null = null
  private offline = false
  private error: string | null = null
  private connecting = false
  private premiumRequired = false
  private controlError: string | null = null
  private errorTimer: ReturnType<typeof setTimeout> | null = null
  private watching = false
  private poller: NowPlayingPoller

  constructor(private deps: SpotifyDeps) {
    this.poller = new NowPlayingPoller({
      fetchNow: () => deps.api.nowPlaying(),
      onUpdate: (np, offline) => {
        this.nowPlaying = np
        this.offline = offline
        this.emit()
      },
      onAuthLost: () => this.revoked()
    })
  }

  get state(): SpotifyState {
    const status = this.connecting ? 'connecting' : !this.deps.clientId() ? 'no-client' : this.deps.auth.connected ? 'connected' : 'disconnected'
    return { status, nowPlaying: status === 'connected' ? this.nowPlaying : null, offline: this.offline, error: this.error, canControl: this.deps.auth.canControl, premiumRequired: this.premiumRequired, controlError: this.controlError }
  }

  async connect(): Promise<void> {
    if (this.connecting || !this.deps.clientId()) return
    this.connecting = true
    this.error = null
    this.premiumRequired = false
    this.emit()
    try {
      await this.deps.auth.connect()
    } catch (e) {
      this.error = e instanceof LoginCancelledError ? null : (e as Error).message
    } finally {
      this.connecting = false
    }
    this.syncPoller()
    this.emit()
    void this.pollHistory()
  }

  start(): () => void {
    void this.pollHistory()
    const timer = setInterval(() => void this.pollHistory(), HISTORY_POLL_MS)
    return () => clearInterval(timer)
  }

  stats(range: StatsRange): Stats {
    return computeStats(this.deps.history.plays, range, Date.now())
  }

  cancel(): void {
    this.deps.auth.cancel()
  }

  async control(action: ControlAction): Promise<void> {
    if (!this.deps.auth.canControl) return this.fail('Reconnect to enable controls')
    if (this.premiumRequired) return this.fail('Controls need Spotify Premium')
    try {
      await this.deps.api.control(action)
    } catch (e) {
      if (e instanceof AuthLostError) return this.revoked()
      if (e instanceof ControlError) {
        if (e.kind === 'premium') this.premiumRequired = true
        return this.fail(e.message)
      }
      return this.fail('Could not reach Spotify')
    }
    this.clearControlError()
    for (const ms of [600, 1800]) setTimeout(() => this.poller.pollNow(), ms)
  }

  disconnect(): void {
    this.reset()
  }

  setWatching(on: boolean): void {
    this.watching = on
    this.syncPoller()
  }

  clientIdChanged(): void {
    this.reset()
  }

  private async pollHistory(): Promise<void> {
    if (!this.deps.auth.connected) return
    try {
      this.deps.history.add(await this.deps.api.recentlyPlayed())
    } catch (e) {
      if (e instanceof AuthLostError) this.revoked()
    }
  }

  private revoked(): void {
    this.poller.stop()
    this.deps.auth.disconnect()
    this.nowPlaying = null
    this.offline = false
    this.error = 'Spotify access was revoked - connect again'
    this.emit()
  }

  private fail(message: string): void {
    this.controlError = message
    if (this.errorTimer) clearTimeout(this.errorTimer)
    this.errorTimer = setTimeout(() => this.clearControlError(), 6000)
    this.emit()
  }

  private clearControlError(): void {
    if (this.errorTimer) clearTimeout(this.errorTimer)
    this.errorTimer = null
    if (this.controlError !== null) {
      this.controlError = null
      this.emit()
    }
  }

  private reset(): void {
    this.premiumRequired = false
    this.clearControlError()
    this.poller.stop()
    this.deps.auth.disconnect()
    this.nowPlaying = null
    this.offline = false
    this.error = null
    this.emit()
  }

  private syncPoller(): void {
    if (this.watching && this.deps.auth.connected) this.poller.start()
    else this.poller.stop()
  }

  private emit(): void {
    this.deps.broadcast(this.state)
  }
}
