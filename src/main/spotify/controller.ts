import type { NowPlaying, SpotifyState } from '../../shared/spotify'
import { NowPlayingPoller } from './poller'

export interface SpotifyDeps {
  clientId(): string
  auth: { connected: boolean; connect(): Promise<void>; disconnect(): void }
  api: { nowPlaying(): Promise<NowPlaying | null> }
  broadcast(s: SpotifyState): void
}

export class SpotifyController {
  private nowPlaying: NowPlaying | null = null
  private offline = false
  private error: string | null = null
  private connecting = false
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
      onAuthLost: () => {
        deps.auth.disconnect()
        this.nowPlaying = null
        this.offline = false
        this.error = 'Spotify access was revoked - connect again'
        this.emit()
      }
    })
  }

  get state(): SpotifyState {
    const status = this.connecting ? 'connecting' : !this.deps.clientId() ? 'no-client' : this.deps.auth.connected ? 'connected' : 'disconnected'
    return { status, nowPlaying: status === 'connected' ? this.nowPlaying : null, offline: this.offline, error: this.error }
  }

  async connect(): Promise<void> {
    if (this.connecting || !this.deps.clientId()) return
    this.connecting = true
    this.error = null
    this.emit()
    try {
      await this.deps.auth.connect()
    } catch (e) {
      this.error = (e as Error).message
    } finally {
      this.connecting = false
    }
    this.syncPoller()
    this.emit()
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

  private reset(): void {
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
