import { BrowserWindow, screen } from 'electron'
import type { PanelId, PanelState } from '../shared/types'
import { defaultBounds, type Rect } from './layout'
import type { Store } from './store'

interface Paths {
  preload: string
  devUrl?: string
  file: string
}

const MIN_W = 220
const MIN_H = 160
const CENTERED: PanelId[] = ['settings', 'profile']

export class PanelManager {
  quitting = false
  private wins = new Map<PanelId, BrowserWindow>()
  private saveTimers = new Map<PanelId, NodeJS.Timeout>()

  constructor(private store: Store, private paths: Paths, private onVisibility: () => void) {}

  show(id: PanelId): void {
    this.setVisible(id, true)
    const win = this.wins.get(id)
    if (!win) {
      this.create(id)
      return
    }
    if (CENTERED.includes(id)) win.setBounds(this.bounds(id, this.store.data.settings.panels[id]))
    win.show()
  }

  hide(id: PanelId): void {
    if (id === 'bar') return
    this.setVisible(id, false)
    this.wins.get(id)?.hide()
  }

  toggle(id: PanelId): void {
    if (id === 'bar') return
    if (this.wins.get(id)?.isVisible()) this.hide(id)
    else this.show(id)
  }

  window(id: PanelId): BrowserWindow | undefined {
    return this.wins.get(id)
  }

  setSize(id: PanelId, width: number, height: number): void {
    const win = this.wins.get(id)
    if (!win || id === 'bar') return
    win.setSize(Math.max(MIN_W, Math.round(width)), Math.max(MIN_H, Math.round(height)))
    this.saveBounds(id)
  }

  applyAlwaysOnTop(): void {
    for (const win of this.wins.values()) this.applyTop(win)
  }

  broadcast(channel: string, payload: unknown): void {
    for (const win of this.wins.values()) {
      if (!win.isDestroyed()) win.webContents.send(channel, payload)
    }
  }

  private applyTop(win: BrowserWindow): void {
    win.setAlwaysOnTop(this.store.data.settings.alwaysOnTop, 'screen-saver')
  }

  private setVisible(id: PanelId, visible: boolean): void {
    this.store.update((d) => {
      d.settings.panels[id].visible = visible
    })
    this.onVisibility()
  }

  private create(id: PanelId): BrowserWindow {
    const win = new BrowserWindow({
      ...this.bounds(id, this.store.data.settings.panels[id]),
      frame: false,
      transparent: true,
      resizable: false,
      skipTaskbar: true,
      hasShadow: false,
      show: false,
      webPreferences: { preload: this.paths.preload, contextIsolation: true, sandbox: true }
    })
    this.applyTop(win)
    if (this.paths.devUrl) win.loadURL(`${this.paths.devUrl}#/${id}`)
    else win.loadFile(this.paths.file, { hash: `/${id}` })
    win.once('ready-to-show', () => {
      if (this.store.data.settings.panels[id].visible) win.show()
    })
    win.on('close', (e) => {
      if (this.quitting) return
      e.preventDefault()
      this.hide(id)
    })
    win.on('session-end', () => {
      this.quitting = true
    })
    win.on('move', () => this.saveBounds(id))
    win.on('closed', () => this.wins.delete(id))
    this.wins.set(id, win)
    return win
  }

  private saveBounds(id: PanelId): void {
    clearTimeout(this.saveTimers.get(id))
    this.saveTimers.set(
      id,
      setTimeout(() => {
        const win = this.wins.get(id)
        if (!win || win.isDestroyed()) return
        const { x, y, width, height } = win.getBounds()
        this.store.update((d) => {
          Object.assign(d.settings.panels[id], { x, y, width, height })
        })
      }, 300)
    )
  }

  private bounds(id: PanelId, ps: PanelState): Rect {
    const { width, height } = ps
    if (!CENTERED.includes(id) && ps.x !== undefined && ps.y !== undefined) {
      const x = ps.x
      const y = ps.y
      const onScreen = screen.getAllDisplays().some((d) => {
        const a = d.workArea
        return x >= a.x - width + 40 && x < a.x + a.width - 40 && y >= a.y && y < a.y + a.height - 40
      })
      if (onScreen) return { x, y, width, height }
    }
    return defaultBounds(id, screen.getPrimaryDisplay().workArea, this.store.data.settings.panels)
  }
}
