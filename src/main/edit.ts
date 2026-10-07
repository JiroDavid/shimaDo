import type { AppData, EditState, PanelId } from '../shared/types'
import { clearElement, emptyDesign, parseSelections, removeAssetUsers, setOverride, type Design, type SelectedElement } from '../shared/design'
import { elementById, groupById, isKnownKey, isMovableKey, GROUP_PREFIX } from '../shared/elements'
import { arrange, isRegion, raiseSticker, stepLayer, stepSticker } from '../shared/layers'
import { addRecent, applyPreset, deletePreset, savePreset } from '../shared/presets'
import { isLayer, normaliseRotation, retargetSticker, FREE_PANEL, SLOT_BOTTOM, addSticker, deleteSticker, duplicateSticker, placeSticker, reorderSticker, setBackground, setMove, updateSticker } from '../shared/placement'
import { canRedo, canUndo, createHistory, record, redo, undo, type History } from '../shared/history'

export interface EditHost {
  data(): AppData
  update(fn: (d: AppData) => void): void
  show(id: PanelId): void
  hide(id: PanelId): void
  broadcast(channel: string, payload: unknown): void
  changed(): void
  removeAsset(id: string): void
  newId(): string
  spawnPoint(size: number, index: number): { x: number; y: number }
  moveStickerToSpace(id: string): void
}

export interface MenuEntry {
  label?: string
  separator?: boolean
  checked?: boolean
  run?: () => void
  submenu?: MenuEntry[]
}

const SEP: MenuEntry = { separator: true }
const OPACITIES = [100, 75, 50, 25]
const CORNERS = [
  { label: 'Square', value: 0 },
  { label: 'Soft', value: 14 },
  { label: 'Circle', value: 50 }
]

export class EditSession {
  private active = false
  private selected: SelectedElement[] = []
  private dom: Record<string, string[]> = {}
  private cropping: string | null = null
  private spaceClicks = 0
  private batchKey: string | null = null
  private history: History<Design> = createHistory(emptyDesign())

  constructor(private host: EditHost, private now: () => number = Date.now) {}

  get state(): EditState {
    return { active: this.active, selected: this.selected, canUndo: this.active && canUndo(this.history), canRedo: this.active && canRedo(this.history), dom: this.dom, cropping: this.cropping, spaceClicks: this.spaceClicks }
  }

  setActive(on: boolean): void {
    if (on === this.active) return
    this.active = on
    this.selected = []
    this.dom = {}
    this.cropping = null
    if (on) {
      this.history = createHistory(structuredClone(this.host.data().design))
      this.host.show('designer')
      this.host.show('layers')
    } else {
      this.host.hide('designer')
      this.host.hide('layers')
    }
    this.publish()
  }

  select(raw: unknown): void {
    if (!this.active) return
    const next = parseSelections(raw, this.host.data().design.stickers)
    const asked = Array.isArray(raw) ? raw.length > 0 : raw !== null && raw !== undefined
    if (asked && next.length === 0) return
    this.selected = next
    if (this.cropping && !(next.length === 1 && next[0].id === `sticker:${this.cropping}`)) this.cropping = null
    this.publish()
  }

  spaceClick(): void {
    if (!this.active) return
    this.selected = []
    this.cropping = null
    this.spaceClicks++
    this.publish()
  }

  setCropping(id: unknown): void {
    if (id !== null && !this.allows(id)) return
    if (id === null) {
      if (this.cropping === null) return
      this.cropping = null
      this.publish()
      return
    }
    if (typeof id !== 'string') return
    const s = this.host.data().design.stickers.find((x) => x.id === id)
    if (!s || s.kind !== 'image') return
    this.cropping = id
    if (!(this.selected.length === 1 && this.selected[0].id === `sticker:${id}`)) this.selectSticker(id, s.panel)
    this.publish()
  }

  reportDom(panel: unknown, ids: unknown): void {
    if (!this.active || typeof panel !== 'string' || !Array.isArray(ids)) return
    const list = ids.filter((x): x is string => typeof x === 'string').slice(0, 300)
    const before = this.dom[panel]
    if (before && before.length === list.length && before.every((x, i) => x === list[i])) return
    this.dom = { ...this.dom, [panel]: list }
    this.publish()
  }

  patchMany(keys: unknown, patch: unknown): void {
    this.many(keys, (key) => this.patch(key, patch), 'patch')
  }

  resetMany(keys: unknown): void {
    this.many(keys, (key) => this.reset(key), 'reset')
  }

  updateStickers(ids: unknown, patch: unknown): void {
    this.many(ids, (id) => this.updateSticker(id, patch), 'stickers')
  }

  private many(list: unknown, each: (item: string) => void, label: string): void {
    if (!Array.isArray(list)) return
    this.batchKey = `${label}:${this.now()}`
    try {
      for (const item of list.slice(0, 50)) if (typeof item === 'string') each(item)
    } finally {
      this.batchKey = null
    }
  }

  patch(key: unknown, patch: unknown): void {
    if (!this.active || typeof key !== 'string') return
    const current = this.host.data().design
    const next = setOverride(current, key, patch)
    if (next === current) return
    this.commit(next, key)
  }

  reset(key: unknown): void {
    if (!this.active || typeof key !== 'string') return
    const current = this.host.data().design
    const next = clearElement(current, key)
    if (next === current) return
    this.commit(next, `reset:${key}`)
  }

  resetAll(): void {
    if (!this.active) return
    const d = this.host.data().design
    if (Object.keys(d.overrides).length + Object.keys(d.moves).length + d.stickers.length + Object.keys(d.backgrounds).length + Object.keys(d.order).length === 0) return
    this.commit({ ...emptyDesign(), recentColors: d.recentColors, presets: d.presets }, 'reset:all')
  }

  move(key: unknown, x: unknown, y: unknown): void {
    if (!this.active || typeof key !== 'string') return
    const d = this.host.data().design
    const moves = setMove(d.moves, key, { x, y })
    if (moves === d.moves) return
    this.commit({ ...d, moves }, `move:${key}`)
  }

  resizeElement(key: unknown, width: unknown, height: unknown, x: unknown, y: unknown): void {
    if (!this.active || typeof key !== 'string' || !isMovableKey(key)) return
    const d = this.host.data().design
    const sized = setOverride(d, key, { width, height })
    const moves = setMove(sized.moves, key, { x, y })
    if (sized === d && moves === d.moves) return
    this.commit({ ...sized, moves }, `resize:${key}`)
  }

  resetPosition(key: unknown): void {
    if (!this.active || typeof key !== 'string') return
    const d = this.host.data().design
    const moves = setMove(d.moves, key, null)
    if (moves === d.moves) return
    this.commit({ ...d, moves }, `reset-move:${key}`)
  }

  addSticker(draft: unknown): void {
    if (!this.active) return
    const d = this.host.data().design
    const id = this.host.newId()
    const stickers = addSticker(d.stickers, this.withSpawn(draft, d.stickers.filter((s) => s.panel === FREE_PANEL).length), this.host.data().assets, id)
    if (!stickers) return
    this.selectSticker(id, stickers[stickers.length - 1].panel)
    this.commit({ ...d, stickers }, `sticker-add:${id}`)
  }

  private withSpawn(draft: unknown, existing: number): unknown {
    if (typeof draft !== 'object' || draft === null) return draft
    const d = draft as Record<string, unknown>
    if (d.panel !== FREE_PANEL) return draft
    if (d.spawn !== true && Number.isFinite(d.x) && Number.isFinite(d.y)) return { ...d, layer: 'front' }
    const size = typeof d.size === 'number' ? d.size : 160
    const at = this.host.spawnPoint(size, existing)
    return { ...d, size, layer: 'front', x: at.x, y: at.y }
  }

  selectFree(ids: unknown, additive: unknown): void {
    if (!this.active || !Array.isArray(ids)) return
    const stickers = this.host.data().design.stickers
    const wanted = ids.filter((x): x is string => typeof x === 'string' && stickers.some((s) => s.panel === FREE_PANEL && `sticker:${s.id}` === x))
    const current = this.selected.filter((s) => s.panel === FREE_PANEL).map((s) => s.id)
    const next = additive === true ? [...current.filter((c) => !wanted.includes(c)), ...wanted.filter((w) => !current.includes(w))] : wanted
    this.select(next.map((id) => ({ id, panel: FREE_PANEL, computed: { color: '', background: '', borderColor: '', radius: 0, borderWidth: 0, fontSize: 0, bold: false } })))
  }

  moveFloat(id: unknown, x: unknown, y: unknown): void {
    if (!this.allows(id) || typeof id !== 'string') return
    const d = this.host.data().design
    const stickers = updateSticker(d.stickers, id, { x, y }, this.host.data().assets)
    if (stickers === d.stickers) return
    this.commit({ ...d, stickers }, `float:${id}`)
  }

  moveStickerTo(id: unknown, panel: unknown, x: unknown, y: unknown, size: unknown): boolean {
    if (!this.allows(id) || typeof id !== 'string') return false
    const d = this.host.data().design
    const stickers = retargetSticker(d.stickers, id, { panel, x, y, size }, this.host.data().assets)
    if (stickers === d.stickers) return false
    this.commit({ ...d, stickers }, `sticker-move:${id}:${this.now()}`)
    const moved = stickers.find((s) => s.id === id)
    if (moved && this.selected.some((s) => s.id === `sticker:${id}`)) this.selectSticker(id, moved.panel)
    return true
  }

  updateSticker(id: unknown, patch: unknown): void {
    if (!this.allows(id) || typeof id !== 'string') return
    const d = this.host.data().design
    const stickers = updateSticker(d.stickers, id, patch, this.host.data().assets)
    if (stickers === d.stickers) return
    this.commit({ ...d, stickers }, `sticker:${id}`)
  }

  stepSticker(id: unknown, direction: unknown): void {
    if (!this.allows(id) || typeof id !== 'string' || (direction !== 'forward' && direction !== 'back')) return
    const d = this.host.data().design
    const panel = d.stickers.find((s) => s.id === id)?.panel
    if (!panel) return
    const next = stepSticker(d, panel, id, direction, this.dom[panel])
    if (next === d) return
    this.commit(next, `sticker-step:${id}:${this.now()}`)
  }

  private arrangeElement(panel: string, key: string, above: string | null): void {
    this.arrange(panel, key, 'front', above)
  }

  setAnchors(updates: unknown): void {
    if (!Array.isArray(updates)) return
    const d = this.host.data().design
    let stickers = d.stickers
    for (const u of updates.slice(0, 60)) {
      if (typeof u !== 'object' || u === null) continue
      const { id, anchor } = u as { id?: unknown; anchor?: unknown }
      if (typeof id !== 'string') continue
      stickers = updateSticker(stickers, id, { anchor: anchor ?? null }, this.host.data().assets)
    }
    if (stickers !== d.stickers) this.write({ ...d, stickers })
  }

  stepElement(key: unknown, direction: unknown): void {
    if (!this.active || typeof key !== 'string' || (direction !== 'forward' && direction !== 'back')) return
    const panel = elementById(key)?.panel
    if (!panel) return
    const d = this.host.data().design
    const next = stepLayer(d, panel, key, direction, this.dom[panel])
    if (next !== d) this.commit(next, `element-step:${key}:${this.now()}`)
  }

  raiseSticker(id: unknown): void {
    if (!this.allows(id) || typeof id !== 'string') return
    const d = this.host.data().design
    const next = raiseSticker(d, id)
    if (next !== d) this.commit(next, `sticker-raise:${id}:${this.now()}`)
  }

  reorderSticker(id: unknown, direction: unknown): void {
    if (!this.active || typeof id !== 'string' || (direction !== 'forward' && direction !== 'back')) return
    const d = this.host.data().design
    const stickers = reorderSticker(d.stickers, id, direction)
    if (stickers === d.stickers) return
    this.commit({ ...d, stickers }, `sticker-order:${id}:${this.now()}`)
  }

  arrange(panel: unknown, id: unknown, region: unknown, aboveId: unknown): void {
    if (!this.active || typeof panel !== 'string' || typeof id !== 'string' || !isRegion(region)) return
    if (aboveId !== null && typeof aboveId !== 'string') return
    const d = this.host.data().design
    const next = arrange(d, panel, id, region, aboveId, this.dom[panel])
    if (next === d) return
    this.commit(next, `arrange:${id}:${this.now()}`)
  }

  placeSticker(id: unknown, layer: unknown, aboveId: unknown): void {
    if (!this.active || typeof id !== 'string' || (aboveId !== null && typeof aboveId !== 'string')) return
    if (!isLayer(layer)) return
    const d = this.host.data().design
    const stickers = placeSticker(d.stickers, id, layer, aboveId)
    if (stickers === d.stickers) return
    this.commit({ ...d, stickers }, `sticker-place:${id}:${this.now()}`)
  }

  deleteSticker(id: unknown): void {
    if (!this.allows(id) || typeof id !== 'string') return
    const d = this.host.data().design
    const stickers = deleteSticker(d.stickers, id)
    if (stickers === d.stickers) return
    this.selected = this.selected.filter((x) => x.id !== `sticker:${id}`)
    if (this.cropping === id) this.cropping = null
    this.commit({ ...d, stickers }, `sticker-delete:${id}`)
  }

  duplicateSticker(id: unknown): void {
    if (!this.allows(id) || typeof id !== 'string') return
    const d = this.host.data().design
    const newId = this.host.newId()
    const stickers = duplicateSticker(d.stickers, id, newId)
    if (!stickers) return
    this.selectSticker(newId, stickers[stickers.length - 1].panel)
    this.commit({ ...d, stickers }, `sticker-add:${newId}`)
  }

  setBackground(key: unknown, bg: unknown): void {
    if (!this.active || typeof key !== 'string') return
    const d = this.host.data().design
    const backgrounds = setBackground(d.backgrounds, key, bg, this.host.data().assets)
    if (backgrounds === d.backgrounds) return
    this.commit({ ...d, backgrounds }, `background:${key}`)
  }

  deleteAsset(id: unknown): void {
    if (!this.active || typeof id !== 'string') return
    if (!Object.prototype.hasOwnProperty.call(this.host.data().assets, id)) return
    const next = removeAssetUsers(this.host.data().design, id)
    this.host.removeAsset(id)
    this.selected = this.selected.filter((x) => !x.id.startsWith('sticker:') || next.stickers.some((s) => `sticker:${s.id}` === x.id))
    this.history = createHistory(next)
    this.write(next)
  }

  undo(): void {
    if (!this.active || !canUndo(this.history)) return
    this.history = undo(this.history)
    this.write(this.keepExtras(this.history.present))
  }

  redo(): void {
    if (!this.active || !canRedo(this.history)) return
    this.history = redo(this.history)
    this.write(this.keepExtras(this.history.present))
  }

  addRecentColor(value: unknown): void {
    if (!this.active) return
    const d = this.host.data().design
    const recentColors = addRecent(d.recentColors, value)
    if (recentColors.length === d.recentColors.length && recentColors.every((c, i) => c === d.recentColors[i])) return
    this.write({ ...d, recentColors })
  }

  savePreset(panel: unknown, name: unknown): void {
    if (!this.active || typeof panel !== 'string') return
    const d = this.host.data().design
    const next = savePreset(d, panel, name, this.host.newId())
    if (next) this.write(next)
  }

  deletePreset(id: unknown): void {
    if (!this.active || typeof id !== 'string') return
    const d = this.host.data().design
    const next = deletePreset(d, id)
    if (next !== d) this.write(next)
  }

  applyPreset(id: unknown, panel: unknown): void {
    if (!this.active || typeof id !== 'string' || typeof panel !== 'string') return
    const d = this.host.data().design
    const next = applyPreset(d, id, panel)
    if (next !== d) this.commit(next, `preset:${id}:${panel}:${this.now()}`)
  }

  contextMenu(panel: unknown, ids: unknown): MenuEntry[] {
    if ((!this.active && panel !== FREE_PANEL) || typeof panel !== 'string' || !Array.isArray(ids)) return []
    const d = this.host.data().design
    const refs = ids.filter((x): x is string => typeof x === 'string')
    const stickers = refs.flatMap((r) => (r.startsWith('sticker:') ? d.stickers.filter((s) => `sticker:${s.id}` === r && s.panel === panel) : []))
    if (stickers.length > 0) {
      const first = stickers[0]
      const sids = stickers.map((s) => s.id)
      const update = (patch: Record<string, unknown>) => () => this.updateStickers(sids, patch)
      const each = (fn: (id: string) => void) => () => sids.forEach(fn)
      const opacity = Math.round((first.opacity ?? 1) * 100)
      return [
        { label: 'Flip horizontal', run: update({ flipX: !first.flipX }) },
        { label: 'Flip vertical', run: update({ flipY: !first.flipY }) },
        { label: 'Rotate 90° right', run: update({ rotation: normaliseRotation((first.rotation ?? 0) + 90) }) },
        { label: 'Rotate 90° left', run: update({ rotation: normaliseRotation((first.rotation ?? 0) - 90) }) },
        ...(stickers.length === 1 && first.kind === 'image' ? [{ label: 'Crop', run: () => this.setCropping(first.id) }] : []),
        SEP,
        { label: 'Bring forward', run: each((id) => this.stepSticker(id, 'forward')) },
        { label: 'Send backward', run: each((id) => this.stepSticker(id, 'back')) },
        SEP,
        { label: 'Opacity', submenu: OPACITIES.map((o) => ({ label: `${o}%`, checked: opacity === o, run: update({ opacity: o / 100 }) })) },
        { label: 'Corners', submenu: CORNERS.map((c) => ({ label: c.label, checked: (first.round ?? 0) === c.value, run: update({ round: c.value }) })) },
        { label: 'Reset image', run: update({ rotation: 0, flipX: false, flipY: false, crop: null, opacity: 1, round: 0 }) },
        SEP,
        ...(panel === FREE_PANEL
          ? []
          : [
              { label: 'Bring to front', run: each((id) => this.arrange(panel, `sticker:${id}`, 'front', null)) },
              { label: 'Send behind content', run: each((id) => this.arrange(panel, `sticker:${id}`, 'behind', null)) },
              { label: 'Move to empty space', run: each((id) => this.host.moveStickerToSpace(id)) }
            ]),
        { label: 'Duplicate', run: each((id) => this.duplicateSticker(id)) },
        { label: 'Delete', run: each((id) => this.deleteSticker(id)) }
      ]
    }
    const keys = refs.filter((r) => !r.startsWith('sticker:') && !r.startsWith(GROUP_PREFIX) && elementById(r)?.panel === panel)
    const groups = refs.filter((r) => r.startsWith(GROUP_PREFIX) && isKnownKey(r))
    const all = [...keys, ...groups]
    if (all.length === 0) return []
    const movable = keys.filter((k) => isMovableKey(k))
    const out: MenuEntry[] = []
    if (movable.length > 0) {
      const each = (fn: (k: string) => void) => () => movable.forEach(fn)
      out.push(
        { label: 'Bring to front', run: each((k) => this.arrangeElement(panel, k, null)) },
        { label: 'Bring forward', run: each((k) => this.stepElement(k, 'forward')) },
        { label: 'Send backward', run: each((k) => this.stepElement(k, 'back')) },
        { label: 'Send to back', run: each((k) => this.arrangeElement(panel, k, SLOT_BOTTOM)) },
        SEP
      )
    }
    out.push({ label: 'Reset style', run: () => this.resetMany(all) })
    if (movable.length > 0) out.push({ label: 'Reset position', run: () => movable.forEach((k) => this.resetPosition(k)) })
    if (groups.length === 0 && keys.every((k) => elementById(k)?.props.includes('size'))) out.push({ label: 'Auto size', run: () => this.patchMany(keys, { width: null, height: null }) })
    const hideable = all.every((k) => (k.startsWith(GROUP_PREFIX) ? groupById(k.slice(GROUP_PREFIX.length))?.props : elementById(k)?.props)?.includes('hide'))
    if (hideable) {
      const hidden = d.overrides[all[0]]?.hidden === true
      out.push(SEP, { label: hidden ? 'Show' : 'Hide', run: () => this.patchMany(all, { hidden: !hidden }) })
    }
    return out
  }

  private keepExtras(design: Design): Design {
    const live = this.host.data().design
    return { ...design, recentColors: live.recentColors, presets: live.presets }
  }

  private selectSticker(id: string, panel: SelectedElement['panel']): void {
    this.selected = [{ id: `sticker:${id}`, panel, computed: { color: '', background: '', borderColor: '', radius: 0, borderWidth: 0, fontSize: 0, bold: false } }]
  }

  private allows(id: unknown): boolean {
    if (this.active) return true
    if (typeof id !== 'string') return false
    return this.host.data().design.stickers.some((s) => s.id === id && s.panel === FREE_PANEL)
  }

  private commit(next: Design, key: string): void {
    if (!this.active) return this.write(next)
    this.history = record(this.history, next, this.batchKey ?? key, this.now())
    this.write(next)
  }

  private write(design: Design): void {
    this.host.update((d) => {
      d.design = design
    })
    this.host.broadcast('data:changed', this.host.data())
    this.publish()
  }

  private publish(): void {
    this.host.broadcast('edit:state', this.state)
    this.host.changed()
  }
}
