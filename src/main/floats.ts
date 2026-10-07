import { BrowserWindow, dialog, nativeImage, screen } from 'electron'
import { boxCentre, floatBounds, positionFromCentre, type Rect } from '../shared/float'
import { angleFrom, cropFromDrag, rotationFromDrag } from '../shared/stickerDrag'
import { FREE_PANEL, type Sticker } from '../shared/placement'
import type { PanelId } from '../shared/types'
import { shouldBlockNavigation } from './navigation'
import type { EditSession } from './edit'
import type { PanelManager } from './panels'
import type { Store } from './store'

interface Paths {
  icon: string
  preload: string
  devUrl?: string
  file: string
}

interface Drag {
  id: string
  start: Rect
  timer: NodeJS.Timeout
  safety: NodeJS.Timeout
}

type GestureKind = 'resize' | 'rotate' | 'crop'

interface Gesture {
  id: string
  kind: GestureKind
  handle: string
  snap: boolean
  origin: { x: number; y: number }
  start: Sticker
  centre: { x: number; y: number }
  angle0: number
  distance0: number
  patch: Record<string, unknown> | null
  timer: NodeJS.Timeout
  safety: NodeJS.Timeout
}

const POLL_MS = 8
const GESTURE_MS = 16
const SAFETY_MS = 20000
const RAISE_DELAY_MS = 30
const MIN_SIZE = 16
const MAX_SIZE = 1600

export class FloatManager {
  private wins = new Map<string, BrowserWindow>()
  private drag: Drag | null = null
  private gesture: Gesture | null = null
  private declined = new Map<string, PanelId>()
  private raiseTimer: NodeJS.Timeout | null = null
  private orderKey = ''

  constructor(private store: Store, private panels: PanelManager, private edit: EditSession, private paths: Paths) {}

  private frees(): Sticker[] {
    return this.store.data.design.stickers.filter((s) => s.panel === FREE_PANEL)
  }

  spawnPoint(size: number, index: number): { x: number; y: number } {
    const area = this.panels.homeDisplay().workArea
    const step = (index % 8) * 28
    return { x: Math.round(area.x + area.width / 2 - size / 2 + step), y: Math.round(area.y + area.height / 2 - size / 2 + step) }
  }

  sync(): void {
    const stickers = this.frees()
    const want = new Set(stickers.map((s) => s.id))
    for (const [id, win] of this.wins) {
      if (want.has(id)) continue
      if (this.drag?.id === id) this.endDragTimers()
      if (this.gesture?.id === id) this.endGestureTimers()
      this.declined.delete(id)
      this.wins.delete(id)
      if (!win.isDestroyed()) win.destroy()
    }
    const orderKey = stickers.map((s) => s.id).join(',')
    const reordered = orderKey !== this.orderKey
    this.orderKey = orderKey
    const hidden = this.panels.minimized
    const onTop = this.store.data.settings.alwaysOnTop
    for (const s of stickers) {
      let win = this.wins.get(s.id)
      if (!win || win.isDestroyed()) win = this.create(s.id, floatBounds(s, this.edit.state.cropping === s.id))
      if (this.drag?.id !== s.id && this.gesture?.id !== s.id) {
        const bounds = floatBounds(s, this.edit.state.cropping === s.id)
        const cur = win.getBounds()
        if (cur.x !== bounds.x || cur.y !== bounds.y || cur.width !== bounds.width || cur.height !== bounds.height) win.setBounds(bounds)
      }
      if (win.isAlwaysOnTop() !== onTop) win.setAlwaysOnTop(onTop, 'floating')
      if (hidden) win.hide()
      else if (!win.isVisible() && win.webContents.getURL() !== '') win.showInactive()
    }
    if (reordered && stickers.length > 1) this.raiseAll()
  }

  raiseAll(): void {
    if (this.raiseTimer) return
    this.raiseTimer = setTimeout(() => {
      this.raiseTimer = null
      for (const s of this.frees()) {
        const win = this.wins.get(s.id)
        if (win && !win.isDestroyed() && win.isVisible()) win.moveTop()
      }
    }, RAISE_DELAY_MS)
  }

  beginDrag(id: unknown): void {
    if (typeof id !== 'string') return
    const win = this.wins.get(id)
    if (!win || win.isDestroyed()) return
    this.endDragTimers()
    this.edit.raiseSticker(id)
    win.moveTop()
    const start = win.getBounds()
    const origin = screen.getCursorScreenPoint()
    const timer = setInterval(() => {
      if (win.isDestroyed()) return this.endDragTimers()
      const p = screen.getCursorScreenPoint()
      win.setBounds({ ...start, x: start.x + p.x - origin.x, y: start.y + p.y - origin.y })
    }, POLL_MS)
    const safety = setTimeout(() => this.endDragTimers(), SAFETY_MS)
    this.drag = { id, start, timer, safety }
  }

  async endDrag(id: unknown): Promise<void> {
    if (typeof id !== 'string' || this.drag?.id !== id) return
    const win = this.wins.get(id)
    const start = this.drag.start
    this.endDragTimers()
    const sticker = this.frees().find((s) => s.id === id)
    if (!win || win.isDestroyed() || !sticker) return
    const b = win.getBounds()
    if (Math.hypot(b.x - start.x, b.y - start.y) < 4) return
    const centre = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    const at = positionFromCentre(centre.x, centre.y, sticker)
    this.edit.moveFloat(id, at.x, at.y)
    const target = this.panels.panelAt(screen.getCursorScreenPoint())
    if (!target) {
      this.declined.delete(id)
      return
    }
    if (this.declined.get(id) === target) return
    await this.offerToDock(sticker, target, centre)
  }

  private async offerToDock(sticker: Sticker, panel: PanelId, centre: { x: number; y: number }): Promise<void> {
    const win = this.panels.getWindow(panel)
    if (!win) return
    const name = panel === 'bar' ? 'bar' : panel
    const answer = await dialog.showMessageBox(win, {
      type: 'question',
      title: 'Image over a window',
      message: `Put this image inside the ${name} window?`,
      detail: 'Inside, it becomes part of the window and scales with it. In empty space it stays on top of the window without belonging to it.',
      buttons: [`Put it inside the ${name} window`, 'Keep it in empty space'],
      defaultId: 1,
      cancelId: 1,
      icon: nativeImage.createFromPath(this.paths.icon)
    })
    if (answer.response !== 0) {
      this.declined.set(sticker.id, panel)
      return
    }
    const geo = await this.panels.designPoint(panel, centre)
    if (!geo) return
    const size = Math.max(MIN_SIZE, Math.round(sticker.size / geo.dipPerUnit))
    const at = positionFromCentre(geo.x, geo.y, { size, crop: sticker.crop })
    this.edit.moveStickerTo(sticker.id, panel, at.x, at.y, size)
  }

  beginGesture(id: unknown, kind: unknown, handle: unknown, snap: unknown): void {
    if (typeof id !== 'string' || (kind !== 'resize' && kind !== 'rotate' && kind !== 'crop')) return
    const start = this.frees().find((s) => s.id === id)
    if (!start) return
    this.endGestureTimers()
    const origin = screen.getCursorScreenPoint()
    const centre = boxCentre(start)
    this.edit.raiseSticker(id)
    this.wins.get(id)?.moveTop()
    this.gesture = {
      id,
      kind,
      handle: typeof handle === 'string' ? handle : '',
      snap: snap === true,
      origin,
      start,
      centre,
      angle0: angleFrom(centre, origin),
      distance0: Math.max(8, Math.hypot(origin.x - centre.x, origin.y - centre.y)),
      patch: null,
      timer: setInterval(() => this.stepGesture(), GESTURE_MS),
      safety: setTimeout(() => this.endGesture(id), SAFETY_MS)
    }
  }

  endGesture(id: unknown): void {
    const g = this.gesture
    if (!g || g.id !== id) return
    this.endGestureTimers()
    const win = this.wins.get(g.id)
    if (g.patch) this.edit.updateSticker(g.id, g.patch)
    if (win && !win.isDestroyed()) win.webContents.send('float:preview', { id: g.id, patch: null })
  }

  private stepGesture(): void {
    const g = this.gesture
    if (!g) return
    const win = this.wins.get(g.id)
    if (!win || win.isDestroyed()) return this.endGestureTimers()
    const p = screen.getCursorScreenPoint()
    let patch: Record<string, unknown>
    if (g.kind === 'resize') {
      const d = Math.hypot(p.x - g.centre.x, p.y - g.centre.y)
      const size = Math.round(Math.min(MAX_SIZE, Math.max(MIN_SIZE, (g.start.size * d) / g.distance0)))
      const at = positionFromCentre(g.centre.x, g.centre.y, { size, crop: g.start.crop })
      patch = { size, x: at.x, y: at.y }
    } else if (g.kind === 'rotate') {
      patch = { rotation: rotationFromDrag(g.start.rotation ?? 0, g.angle0, angleFrom(g.centre, p), g.snap) }
    } else {
      patch = { crop: cropFromDrag(g.start.crop ?? { l: 0, t: 0, r: 0, b: 0 }, g.handle, { dx: p.x - g.origin.x, dy: p.y - g.origin.y }, g.start.size, g.start.rotation ?? 0) }
    }
    const key = JSON.stringify(patch)
    if (g.patch && JSON.stringify(g.patch) === key) return
    g.patch = patch
    const live = { ...g.start, ...patch } as Sticker
    win.setBounds(floatBounds(live, g.kind === 'crop'))
    win.webContents.send('float:preview', { id: g.id, patch })
  }

  async moveToSpace(id: string): Promise<void> {
    const sticker = this.store.data.design.stickers.find((s) => s.id === id)
    if (!sticker || sticker.panel === FREE_PANEL) return
    const geo = await this.panels.stickerScreenGeometry(sticker.panel as PanelId, id)
    if (!geo) return
    const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(sticker.size * geo.dipPerUnit)))
    const at = positionFromCentre(geo.centre.x, geo.centre.y, { size, crop: sticker.crop })
    this.edit.moveStickerTo(id, FREE_PANEL, at.x, at.y, size)
    this.declined.set(id, sticker.panel as PanelId)
  }

  dispose(): void {
    this.endDragTimers()
    this.endGestureTimers()
    if (this.raiseTimer) clearTimeout(this.raiseTimer)
    for (const win of this.wins.values()) if (!win.isDestroyed()) win.destroy()
    this.wins.clear()
  }

  private endDragTimers(): void {
    if (!this.drag) return
    clearInterval(this.drag.timer)
    clearTimeout(this.drag.safety)
    this.drag = null
  }

  private endGestureTimers(): void {
    if (!this.gesture) return
    clearInterval(this.gesture.timer)
    clearTimeout(this.gesture.safety)
    this.gesture = null
  }

  private create(id: string, bounds: Rect): BrowserWindow {
    const win = new BrowserWindow({
      ...bounds,
      frame: false,
      transparent: true,
      resizable: false,
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
    if (this.paths.devUrl) win.loadURL(`${this.paths.devUrl}#/float/${id}`)
    else win.loadFile(this.paths.file, { hash: `/float/${id}` })
    win.once('ready-to-show', () => {
      if (win.isDestroyed() || this.panels.minimized) return
      win.showInactive()
      this.raiseAll()
    })
    win.webContents.on('will-navigate', (e, url) => {
      if (shouldBlockNavigation(win.webContents.getURL(), url)) e.preventDefault()
    })
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.webContents.on('render-process-gone', () => {
      if (!win.isDestroyed()) win.reload()
    })
    win.on('system-context-menu', (e) => e.preventDefault())
    win.on('closed', () => {
      if (this.wins.get(id) === win) this.wins.delete(id)
    })
    this.wins.set(id, win)
    return win
  }
}
