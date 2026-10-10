import { plainNotes, type UpdateState } from '../shared/update'

interface UpdateInfoLike {
  version: string
  releaseNotes?: unknown
}

export interface UpdaterLike {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  on(event: 'update-available' | 'update-downloaded', cb: (info: UpdateInfoLike) => void): unknown
  on(event: 'update-not-available', cb: () => void): unknown
  on(event: 'download-progress', cb: (p: { percent: number }) => void): unknown
  on(event: 'error', cb: (e: Error) => void): unknown
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<unknown>
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void
}

const FIRST_CHECK_MS = 10_000
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000

export class UpdateController {
  state: UpdateState = { kind: 'idle' }
  private dismissed: string | null = null
  private manual = false

  constructor(private updater: UpdaterLike, private enabled: boolean, private onState: (s: UpdateState) => void) {
    updater.autoDownload = false
    updater.autoInstallOnAppQuit = false
    updater.on('update-available', (info) => {
      if (info.version === this.dismissed && !this.manual) return
      this.set({ kind: 'available', version: info.version, notes: plainNotes(info.releaseNotes) })
    })
    updater.on('update-not-available', () => {})
    updater.on('download-progress', (p) => {
      if (this.state.kind === 'downloading') this.set({ ...this.state, percent: Math.round(p.percent) })
    })
    updater.on('update-downloaded', (info) => this.set({ kind: 'ready', version: info.version }))
    // an unhandled 'error' event would throw; failures reach callers through the rejected promises
    updater.on('error', () => {})
  }

  start(): () => void {
    if (!this.enabled) return () => {}
    const first = setTimeout(() => void this.check(false), FIRST_CHECK_MS)
    const every = setInterval(() => void this.check(false), CHECK_EVERY_MS)
    return () => {
      clearTimeout(first)
      clearInterval(every)
    }
  }

  async check(manual: boolean): Promise<UpdateState> {
    if (!this.enabled) return { kind: 'error', during: 'check', message: 'Updates only work in the installed app' }
    const busy = this.state.kind === 'available' || this.state.kind === 'downloading' || this.state.kind === 'ready'
    if (busy) {
      if (manual) this.set(this.state)
      return this.state
    }
    if (this.state.kind === 'error') this.state = { kind: 'idle' }
    this.manual = manual
    try {
      await this.updater.checkForUpdates()
    } catch (e) {
      return { kind: 'error', during: 'check', message: (e as Error).message }
    } finally {
      this.manual = false
    }
    return this.state.kind === 'idle' ? { kind: 'current' } : this.state
  }

  async download(): Promise<void> {
    const s = this.state
    const version = s.kind === 'available' ? s.version : s.kind === 'error' && s.during === 'download' ? s.version : undefined
    if (!version) return
    this.set({ kind: 'downloading', version, percent: 0 })
    try {
      await this.updater.downloadUpdate()
    } catch (e) {
      this.set({ kind: 'error', during: 'download', message: (e as Error).message, version })
    }
  }

  later(): void {
    if (this.state.kind === 'available') this.dismissed = this.state.version
    if (this.state.kind === 'available' || this.state.kind === 'error') this.set({ kind: 'idle' })
  }

  installNow(): void {
    if (this.state.kind === 'ready') this.updater.quitAndInstall(true, true)
  }

  installOnQuit(): void {
    if (this.state.kind === 'ready') this.updater.autoInstallOnAppQuit = true
  }

  private set(s: UpdateState): UpdateState {
    this.state = s
    this.onState(s)
    return s
  }
}
