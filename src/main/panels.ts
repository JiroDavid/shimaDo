import { BrowserWindow, nativeImage, screen } from 'electron'
import { PANEL_IDS, type DisplayInfo, type Edge, type PanelId, type PanelState } from '../shared/types'
import { defaultBounds, effectiveSize, minSize, scaledPanels, type Rect } from './layout'
import { fitOnScreen, resizeBounds, translateBounds } from './resize'
import { defaultData, type Store } from './store'

interface Paths {
  icon: string
  preload: string
  devUrl?: string
  file: string
}

const CENTERED: PanelId[] = ['settings', 'profile', 'confirm']
const UI_SCALE = 0.91
const RESIZE_POLL_MS = 8
const RESIZE_SAFETY_MS = 15000

interface ResizeSession {
  id: PanelId
  timer: NodeJS.Timeout
  safety: NodeJS.Timeout
}

export class PanelManager {
  quitting = false
  minimized = false
  private wins = new Map<PanelId, BrowserWindow>()
  private saveTimers = new Map<PanelId, NodeJS.Timeout>()
  private session: ResizeSession | null = null
  private expanded = new Map<PanelId, { before: { width: number; height: number }; to: { width: number; height: number } }>()

  private get scale(): number {
    return this.store.data.settings.textScale
  }

  constructor(private store: Store, private paths: Paths, private onVisibility: () => void) {}

  show(id: PanelId): void {
    if (this.minimized && id !== 'mini') this.restoreAll()
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

  minimizeAll(): void {
    if (this.minimized) return
    this.endResize()
    this.minimized = true
    const barBounds = this.wins.get('bar')?.getBounds()
    for (const [id, win] of this.wins) {
      if (id !== 'mini' && !win.isDestroyed()) win.hide()
    }
    this.setVisible('mini', true)
    const saved = this.store.data.settings.panels.mini
    const mini = this.wins.get('mini') ?? this.create('mini')
    if (saved.x === undefined && barBounds) mini.setBounds({ x: barBounds.x, y: barBounds.y, width: saved.width, height: saved.height })
    mini.show()
    mini.moveTop()
  }

  restoreAll(): void {
    if (!this.minimized) return
    this.minimized = false
    this.endResize()
    this.setVisible('mini', false)
    this.wins.get('mini')?.hide()
    for (const id of PANEL_IDS) {
      if (id === 'mini') continue
      if (id === 'bar' || this.store.data.settings.panels[id].visible) this.show(id)
    }
  }

  beginMove(id: PanelId): void {
    const win = this.wins.get(id)
    this.endResize()
    if (!win || id !== 'mini') return
    const start = win.getBounds()
    const origin = screen.getCursorScreenPoint()
    const timer = setInterval(() => {
      if (win.isDestroyed()) {
        this.endResize()
        return
      }
      const p = screen.getCursorScreenPoint()
      win.setBounds({ ...start, x: start.x + p.x - origin.x, y: start.y + p.y - origin.y })
    }, RESIZE_POLL_MS)
    const safety = setTimeout(() => this.endResize(), RESIZE_SAFETY_MS)
    this.session = { id, timer, safety }
  }

  expand(id: PanelId, width: number, height: number): void {
    const win = this.wins.get(id)
    if (!win) return
    const cur = win.getBounds()
    const before = this.expanded.get(id)?.before ?? { width: cur.width, height: cur.height }
    const next = fitOnScreen(
      { ...cur, width: Math.max(cur.width, Math.round(width * this.scale)), height: Math.max(cur.height, Math.round(height * this.scale)) },
      this.areas()
    )
    this.expanded.set(id, { before, to: { width: next.width, height: next.height } })
    win.setBounds(next)
  }

  collapse(id: PanelId): void {
    const saved = this.expanded.get(id)
    this.expanded.delete(id)
    const win = this.wins.get(id)
    if (!saved || !win || win.isDestroyed()) return
    const cur = win.getBounds()
    if (cur.width === saved.to.width && cur.height === saved.to.height) win.setBounds({ ...cur, ...saved.before })
  }

  beginResize(id: PanelId, edge: Edge): void {
    const win = this.wins.get(id)
    this.endResize()
    if (!win) return
    const start = win.getBounds()
    const origin = screen.getCursorScreenPoint()
    const area = screen.getDisplayMatching(start).workArea
    const min = minSize(id, this.scale)
    const max = { width: area.width, height: area.height }
    win.setMinimumSize(min.width, min.height)
    win.setMaximumSize(0, 0)
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
    for (const [id, win] of this.wins) this.applyTop(id, win)
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
      const current = win.getBounds()
      if (CENTERED.includes(id)) {
        if (win.isVisible() && !sameRect(fitOnScreen(current, areas), current)) win.setBounds(this.bounds(id, this.store.data.settings.panels[id]))
        continue
      }
      const next = fitOnScreen(current, areas)
      if (sameRect(next, current)) continue
      win.setBounds(next)
      this.saveBoundsNow(id)
    }
  }

  applyScale(previous: number): void {
    const ratio = this.scale / previous
    const zoom = UI_SCALE * this.scale
    const defaults = defaultData().settings.panels
    for (const id of PANEL_IDS) {
      const win = this.wins.get(id)
      const live = win && !win.isDestroyed() ? win : undefined
      const min = minSize(id, this.scale)
      const base = live ? live.getBounds() : this.store.data.settings.panels[id]
      const size =
        id === 'mini'
          ? effectiveSize(id, base, defaults, this.scale)
          : { width: Math.max(min.width, Math.round(base.width * ratio)), height: Math.max(min.height, Math.round(base.height * ratio)) }
      if (live) {
        live.webContents.setZoomFactor(zoom)
        live.setMinimumSize(min.width, min.height)
        const b = live.getBounds()
        live.setBounds({ x: b.x, y: b.y, ...size })
      }
      this.store.update((d) => {
        Object.assign(d.settings.panels[id], size)
      })
    }
    this.fitAll()
  }

  flush(): void {
    for (const id of [...this.saveTimers.keys()]) this.saveBoundsNow(id)
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
    const panels = this.sizedPanels()
    for (const id of PANEL_IDS) {
      if (CENTERED.includes(id)) continue
      const win = this.wins.get(id)
      const ps = this.store.data.settings.panels[id]
      const size = effectiveSize(id, ps, panels)
      const rect: Rect =
        win && !win.isDestroyed()
          ? win.getBounds()
          : ps.x !== undefined && ps.y !== undefined
            ? { x: ps.x, y: ps.y, ...size }
            : defaultBounds(id, this.barDisplay().workArea, panels)
      const next = translateBounds(rect, screen.getDisplayMatching(rect).workArea, target.workArea)
      win?.setBounds(next)
      this.store.update((d) => {
        Object.assign(d.settings.panels[id], next)
      })
    }
    for (const id of CENTERED) {
      const win = this.wins.get(id)
      if (win?.isVisible()) win.setBounds(this.bounds(id, this.store.data.settings.panels[id]))
    }
  }

  resetLayout(): void {
    const area = this.barDisplay().workArea
    const sizes = scaledPanels(defaultData().settings.panels, this.scale)
    for (const id of PANEL_IDS) {
      if (CENTERED.includes(id) || id === 'mini') continue
      const rect = fitOnScreen(defaultBounds(id, area, sizes), [area])
      this.store.update((d) => {
        Object.assign(d.settings.panels[id], rect)
      })
      this.wins.get(id)?.setBounds(rect)
    }
    for (const id of ['bar', 'checklist', 'progress', 'habits'] as PanelId[]) this.show(id)
  }

  private applyTop(id: PanelId, win: BrowserWindow): void {
    win.setAlwaysOnTop(id === 'mini' || this.store.data.settings.alwaysOnTop, 'screen-saver')
  }

  private setVisible(id: PanelId, visible: boolean): void {
    this.store.update((d) => {
      d.settings.panels[id].visible = visible
    })
    this.onVisibility()
  }

  private areas(): Rect[] {
    const bar = this.barDisplay()
    return [bar, ...screen.getAllDisplays().filter((d) => d.id !== bar.id)].map((d) => d.workArea)
  }

  private sizedPanels(): Record<PanelId, PanelState> {
    const panels = this.store.data.settings.panels
    const out = {} as Record<PanelId, PanelState>
    for (const id of PANEL_IDS) out[id] = { ...panels[id], ...effectiveSize(id, panels[id], defaultData().settings.panels, this.scale) }
    return out
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
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: id !== 'bar',
      icon: nativeImage.createFromPath(this.paths.icon),
      hasShadow: false,
      show: false,
      webPreferences: { preload: this.paths.preload, contextIsolation: true, sandbox: true }
    })
    const min = minSize(id, this.scale)
    win.setMinimumSize(min.width, min.height)
    win.setMaximumSize(0, 0)
    win.webContents.setVisualZoomLevelLimits(1, 1)
    win.webContents.on('did-finish-load', () => win.webContents.setZoomFactor(UI_SCALE * this.scale))
    this.applyTop(id, win)
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
    win.on('system-context-menu', (e) => e.preventDefault())
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
    const panels = this.sizedPanels()
    if (CENTERED.includes(id)) return defaultBounds(id, this.barDisplay().workArea, panels)
    if (ps.x !== undefined && ps.y !== undefined) {
      return fitOnScreen({ x: ps.x, y: ps.y, width: panels[id].width, height: panels[id].height }, this.areas())
    }
    return defaultBounds(id, this.barDisplay().workArea, panels)
  }
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}
