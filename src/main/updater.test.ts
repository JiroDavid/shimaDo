import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UpdateController, type UpdaterLike } from './updater'
import type { UpdateState } from '../shared/update'

class FakeUpdater implements UpdaterLike {
  autoDownload = true
  autoInstallOnAppQuit = true
  checks = 0
  downloads = 0
  installed: unknown[] | null = null
  handlers: Record<string, (arg?: any) => void> = {}
  onCheck: () => void | Promise<void> = () => {}
  onDownload: () => void | Promise<void> = () => {}
  on(event: string, cb: (arg?: any) => void): unknown {
    this.handlers[event] = cb
    return this
  }
  emit(event: string, arg?: unknown): void {
    this.handlers[event]?.(arg)
  }
  async checkForUpdates(): Promise<unknown> {
    this.checks++
    await this.onCheck()
    return null
  }
  async downloadUpdate(): Promise<unknown> {
    this.downloads++
    await this.onDownload()
    return null
  }
  quitAndInstall(...args: unknown[]): void {
    this.installed = args
  }
}

function setup(enabled = true) {
  const updater = new FakeUpdater()
  const states: UpdateState[] = []
  const controller = new UpdateController(updater, enabled, (s) => states.push(s))
  return { updater, states, controller }
}

const offer = (u: FakeUpdater, version: string, notes: unknown = '') => (u.onCheck = () => u.emit('update-available', { version, releaseNotes: notes }))

describe('UpdateController', () => {
  it('turns off automatic download and install', () => {
    const { updater } = setup()
    expect(updater.autoDownload).toBe(false)
    expect(updater.autoInstallOnAppQuit).toBe(false)
  })

  it('goes available when a newer version is found', async () => {
    const { updater, controller, states } = setup()
    offer(updater, '0.6.0', '<p>Auto updates</p>')
    const result = await controller.check(false)
    expect(result).toEqual({ kind: 'available', version: '0.6.0', notes: 'Auto updates' })
    expect(states).toEqual([result])
  })

  it('stays silent on a failed background check', async () => {
    const { updater, controller, states } = setup()
    updater.onCheck = () => {
      throw new Error('net::ERR_INTERNET_DISCONNECTED')
    }
    await controller.check(false)
    expect(states).toEqual([])
    expect(controller.state).toEqual({ kind: 'idle' })
  })

  it('reports a failed manual check to the caller without changing state', async () => {
    const { updater, controller, states } = setup()
    updater.onCheck = () => {
      throw new Error('offline')
    }
    expect(await controller.check(true)).toEqual({ kind: 'error', during: 'check', message: 'offline' })
    expect(states).toEqual([])
    expect(controller.state).toEqual({ kind: 'idle' })
  })

  it('reports up to date on a manual check with nothing new', async () => {
    const { updater, controller } = setup()
    updater.onCheck = () => updater.emit('update-not-available')
    expect(await controller.check(true)).toEqual({ kind: 'current' })
    expect(controller.state).toEqual({ kind: 'idle' })
  })

  it('does nothing and explains when not packaged', async () => {
    const { updater, controller } = setup(false)
    const result = await controller.check(true)
    expect(updater.checks).toBe(0)
    expect(result).toMatchObject({ kind: 'error', during: 'check', message: 'Updates only work in the installed app' })
  })

  it('does not schedule checks when not packaged', () => {
    vi.useFakeTimers()
    const { updater, controller } = setup(false)
    controller.start()
    vi.advanceTimersByTime(24 * 3600 * 1000)
    expect(updater.checks).toBe(0)
    vi.useRealTimers()
  })

  describe('schedule', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())
    it('checks 10 seconds after start and then every 6 hours', async () => {
      const { updater, controller } = setup()
      const stop = controller.start()
      await vi.advanceTimersByTimeAsync(9_999)
      expect(updater.checks).toBe(0)
      await vi.advanceTimersByTimeAsync(1)
      expect(updater.checks).toBe(1)
      await vi.advanceTimersByTimeAsync(6 * 3600 * 1000)
      expect(updater.checks).toBe(2)
      stop()
      await vi.advanceTimersByTimeAsync(12 * 3600 * 1000)
      expect(updater.checks).toBe(2)
    })
  })

  it('Later hides the prompt and a background check does not re-offer the same version', async () => {
    const { updater, controller } = setup()
    offer(updater, '0.6.0')
    await controller.check(false)
    controller.later()
    expect(controller.state).toEqual({ kind: 'idle' })
    await controller.check(false)
    expect(controller.state).toEqual({ kind: 'idle' })
  })

  it('a manual check re-offers a version the user said Later to', async () => {
    const { updater, controller } = setup()
    offer(updater, '0.6.0')
    await controller.check(false)
    controller.later()
    await controller.check(true)
    expect(controller.state).toMatchObject({ kind: 'available', version: '0.6.0' })
  })

  it('offers a newer version after Later on an older one', async () => {
    const { updater, controller } = setup()
    offer(updater, '0.6.0')
    await controller.check(false)
    controller.later()
    offer(updater, '0.6.1')
    await controller.check(false)
    expect(controller.state).toMatchObject({ kind: 'available', version: '0.6.1' })
  })

  it('does not start a second check while an update is offered, downloading or ready, and re-emits instead', async () => {
    const { updater, controller, states } = setup()
    offer(updater, '0.6.0')
    await controller.check(false)
    const before = states.length
    await controller.check(true)
    expect(updater.checks).toBe(1)
    expect(states.length).toBe(before + 1)
    expect(states.at(-1)).toMatchObject({ kind: 'available' })
  })

  it('downloads with progress and becomes ready', async () => {
    const { updater, controller } = setup()
    offer(updater, '0.6.0')
    await controller.check(false)
    updater.onDownload = () => {
      updater.emit('download-progress', { percent: 41.6 })
      expect(controller.state).toEqual({ kind: 'downloading', version: '0.6.0', percent: 42 })
      updater.emit('update-downloaded', { version: '0.6.0' })
    }
    await controller.download()
    expect(controller.state).toEqual({ kind: 'ready', version: '0.6.0' })
  })

  it('shows a download failure with the version so it can be retried', async () => {
    const { updater, controller } = setup()
    offer(updater, '0.6.0')
    await controller.check(false)
    updater.onDownload = () => {
      throw new Error('connection reset')
    }
    await controller.download()
    expect(controller.state).toEqual({ kind: 'error', during: 'download', message: 'connection reset', version: '0.6.0' })
    updater.onDownload = () => updater.emit('update-downloaded', { version: '0.6.0' })
    await controller.download()
    expect(updater.downloads).toBe(2)
    expect(controller.state).toEqual({ kind: 'ready', version: '0.6.0' })
  })

  it('ignores download when nothing is offered', async () => {
    const { updater, controller } = setup()
    await controller.download()
    expect(updater.downloads).toBe(0)
  })

  it('installs now silently and restarts the app', async () => {
    const { updater, controller } = setup()
    offer(updater, '0.6.0')
    await controller.check(false)
    updater.onDownload = () => updater.emit('update-downloaded', { version: '0.6.0' })
    await controller.download()
    controller.installNow()
    expect(updater.installed).toEqual([true, true])
  })

  it('install on quit only arms the installer once the update is ready', async () => {
    const { updater, controller } = setup()
    controller.installOnQuit()
    expect(updater.autoInstallOnAppQuit).toBe(false)
    offer(updater, '0.6.0')
    await controller.check(false)
    updater.onDownload = () => updater.emit('update-downloaded', { version: '0.6.0' })
    await controller.download()
    controller.installOnQuit()
    expect(updater.autoInstallOnAppQuit).toBe(true)
  })

  it('installNow does nothing before the download finishes', async () => {
    const { updater, controller } = setup()
    controller.installNow()
    expect(updater.installed).toBeNull()
  })
})
