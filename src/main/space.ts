import { BrowserWindow, nativeImage } from 'electron'
import { shouldBlockNavigation } from './navigation'
import type { EditSession } from './edit'
import type { FloatManager } from './floats'
import type { PanelManager } from './panels'
import type { Store } from './store'

interface Paths {
  icon: string
  preload: string
  devUrl?: string
  file: string
}

export class SpaceManager {
  private wins = new Map<number, BrowserWindow>()
  private top = new Map<number, boolean>()

  constructor(private store: Store, private panels: PanelManager, private floats: FloatManager, private edit: EditSession, private paths: Paths) {}

  sync(): void {
    const on = this.edit.state.active && !this.panels.minimized
    if (!on) return this.destroyAll()
    const displays = this.panels.occupiedDisplays()
    const ids = new Set(displays.map((d) => d.id))
    let created = false
    for (const [id, win] of this.wins) {
      if (ids.has(id)) continue
      this.wins.delete(id)
      this.top.delete(id)
      if (!win.isDestroyed()) win.destroy()
    }
    for (const d of displays) {
      let win = this.wins.get(d.id)
      if (!win || win.isDestroyed()) {
        win = this.create(d.id, d.bounds)
        created = true
      }
      const cur = win.getBounds()
      if (cur.x !== d.bounds.x || cur.y !== d.bounds.y || cur.width !== d.bounds.width || cur.height !== d.bounds.height) win.setBounds(d.bounds)
      const wanted = this.store.data.settings.alwaysOnTop
      if (this.top.get(d.id) !== wanted) {
        win.setAlwaysOnTop(wanted)
        this.top.set(d.id, wanted)
      }
    }
    if (created) this.raiseOthers()
  }

  raiseOthers(): void {
    setTimeout(() => {
      this.panels.raiseAll()
      this.floats.raiseAll()
    }, 150)
  }

  dispose(): void {
    this.destroyAll()
  }

  private destroyAll(): void {
    for (const win of this.wins.values()) if (!win.isDestroyed()) win.destroy()
    this.wins.clear()
    this.top.clear()
  }

  private create(id: number, bounds: { x: number; y: number; width: number; height: number }): BrowserWindow {
    const win = new BrowserWindow({
      ...bounds,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      focusable: false,
      skipTaskbar: true,
      hasShadow: false,
      show: false,
      icon: nativeImage.createFromPath(this.paths.icon),
      webPreferences: { preload: this.paths.preload, contextIsolation: true, sandbox: true }
    })
    win.setMinimumSize(1, 1)
    win.setMaximumSize(0, 0)
    win.webContents.setVisualZoomLevelLimits(1, 1)
    if (this.paths.devUrl) win.loadURL(`${this.paths.devUrl}#/space`)
    else win.loadFile(this.paths.file, { hash: '/space' })
    win.once('ready-to-show', () => {
      if (win.isDestroyed()) return
      win.showInactive()
      this.raiseOthers()
    })
    win.webContents.on('will-navigate', (e, url) => {
      if (shouldBlockNavigation(win.webContents.getURL(), url)) e.preventDefault()
    })
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.on('system-context-menu', (e) => e.preventDefault())
    win.on('closed', () => {
      if (this.wins.get(id) === win) this.wins.delete(id)
    })
    this.wins.set(id, win)
    return win
  }
}
