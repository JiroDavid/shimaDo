import { BrowserWindow, screen } from 'electron'
import { PANEL_IDS, type DisplayInfo, type Edge, type PanelId, type PanelState } from '../shared/types'
import { defaultBounds, MIN_SIZES, type Rect } from './layout'
import { fitOnScreen, resizeBounds, translateBounds } from './resize'
import { defaultData, type Store } from './store'

interface Paths {
  preload: string
  devUrl?: string
  file: string
}

const CENTERED: PanelId[] = ['settings', 'profile', 'confirm']
const RESIZE_POLL_MS = 8
const RESIZE_SAFETY_MS = 15000

interface ResizeSession {
  id: PanelId
  timer: NodeJS.Timeout
  safety: NodeJS.Timeout
}

export class PanelManager {
  quitting = false
  private wins = new Map<PanelId, BrowserWindow>()
  private saveTimers = new Map<PanelId, NodeJS.Timeout>()
  private session: ResizeSession | null = null

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
    win.moveTop()
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

  beginResize(id: PanelId, edge: Edge): void {
    const win = this.wins.get(id)
    this.endResize()
    if (!win || id === 'bar') return
    const start = win.getBounds()
    const origin = screen.getCursorScreenPoint()
    const area = screen.getDisplayMatching(start).workArea
    const min = MIN_SIZES[id]
    const max = { width: area.width, height: area.height }
    let last = start
    const timer = setInterval(() => {
      if (win.isDestroyed()) {
        this.endResize()
        return
      }
      const p = screen.getCursorScreenPoint()
      const next = resizeBounds(start, edge, p.x - origin.x, p.y - origin.y, min, max)
      if (next.x === last.x && next.y === last.y && next.width === last.width && next.height === last.height) return
      last = next
      win.setBounds(next)
    }, RESIZE_POLL_MS)
    const safety = setTimeout(() => this.endResize(), RESIZE_SAFETY_MS)
    this.session = { id, timer, safety }
  }

  endResize(): void {
    if (!this.session) return
    clearInterval(this.session.timer)
    clearTimeout(this.session.safety)
    const id = this.session.id
    this.session = null
    this.saveBoundsNow(id)
  }

  applyAlwaysOnTop(): void {
    for (const win of this.wins.values()) this.applyTop(win)
  }

  broadcast(channel: string, payload: unknown): void {
    for (const win of this.wins.values()) {
      if (!win.isDestroyed()) win.webContents.send(channel, payload)
    }
  }

  fitAll(): void {
    const areas = this.areas()
    for (const [id, win] of this.wins) {
      if (win.isDestroyed()) continue
      if (CENTERED.includes(id)) {
        if (win.isVisible()) win.setBounds(this.bounds(id, this.store.data.settings.panels[id]))
        continue
      }
      win.setBounds(fitOnScreen(win.getBounds(), areas))
      this.saveBoundsNow(id)
    }
  }

  listDisplays(): DisplayInfo[] {
    const primary = screen.getPrimaryDisplay().id
    const barId = this.barDisplay().id
    return screen
      .getAllDisplays()
      .sort((a, b) => a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y)
      .map((d, i) => ({
        id: d.id,
        label: `Monitor ${i + 1} - ${d.size.width}x${d.size.height}`,
        primary: d.id === primary,
        hasBar: d.id === barId
      }))
  }

  moveAllToDisplay(displayId: number): void {
    const target = screen.getAllDisplays().find((d) => d.id === displayId)
    if (!target) return
    const from = this.barDisplay().workArea
    for (const [id, win] of this.wins) {
      if (win.isDestroyed() || CENTERED.includes(id)) continue
      win.setBounds(translateBounds(win.getBounds(), from, target.workArea))
      this.saveBoundsNow(id)
    }
    for (const id of CENTERED) {
      const win = this.wins.get(id)
      if (win?.isVisible()) win.setBounds(this.bounds(id, this.store.data.settings.panels[id]))
    }
  }

  resetLayout(): void {
    const area = this.barDisplay().workArea
    const sizes = defaultData().settings.panels
    for (const id of PANEL_IDS) {
      if (CENTERED.includes(id)) continue
      const rect = defaultBounds(id, area, sizes)
      this.store.update((d) => {
        Object.assign(d.settings.panels[id], rect)
      })
      this.wins.get(id)?.setBounds(rect)
    }
    for (const id of ['bar', 'checklist', 'progress', 'nicotine'] as PanelId[]) this.show(id)
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

  private areas(): Rect[] {
    return screen.getAllDisplays().map((d) => d.workArea)
  }

  private barDisplay() {
    const bar = this.wins.get('bar')
    return bar && !bar.isDestroyed() ? screen.getDisplayMatching(bar.getBounds()) : screen.getPrimaryDisplay()
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
    win.setMinimumSize(MIN_SIZES[id].width, MIN_SIZES[id].height)
    win.setMaximumSize(0, 0)
    this.applyTop(win)
    if (this.paths.devUrl) win.loadURL(`${this.paths.devUrl}#/${id}`)
    else win.loadFile(this.paths.file, { hash: `/${id}` })
    const reveal = () => {
      if (win.isDestroyed() || !this.store.data.settings.panels[id].visible) return
      win.show()
      win.moveTop()
    }
    win.once('ready-to-show', reveal)
    win.webContents.once('did-finish-load', reveal)
    win.on('close', (e) => {
      if (this.quitting) return
      e.preventDefault()
      this.hide(id)
    })
    win.on('session-end', () => {
      this.quitting = true
    })
    win.on('move', () => this.saveBounds(id))
    win.on('resize', () => this.saveBounds(id))
    win.on('closed', () => this.wins.delete(id))
    this.wins.set(id, win)
    return win
  }

  private saveBounds(id: PanelId): void {
    clearTimeout(this.saveTimers.get(id))
    this.saveTimers.set(id, setTimeout(() => this.saveBoundsNow(id), 300))
  }

  private saveBoundsNow(id: PanelId): void {
    clearTimeout(this.saveTimers.get(id))
    const win = this.wins.get(id)
    if (!win || win.isDestroyed()) return
    const { x, y, width, height } = win.getBounds()
    this.store.update((d) => {
      Object.assign(d.settings.panels[id], { x, y, width, height })
    })
  }

  private bounds(id: PanelId, ps: PanelState): Rect {
    const panels = this.store.data.settings.panels
    if (CENTERED.includes(id)) return defaultBounds(id, this.barDisplay().workArea, panels)
    const min = MIN_SIZES[id]
    const width = Math.max(ps.width, min.width)
    const height = Math.max(ps.height, min.height)
    if (ps.x !== undefined && ps.y !== undefined) return fitOnScreen({ x: ps.x, y: ps.y, width, height }, this.areas())
    return defaultBounds(id, screen.getPrimaryDisplay().workArea, panels)
  }
}
