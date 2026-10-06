import type { AppData, EditState, PanelId } from '../shared/types'
import { clearElement, emptyDesign, parseSelection, removeAssetUsers, setOverride, type Design } from '../shared/design'
import { addSticker, deleteSticker, duplicateSticker, setBackground, setMove, updateSticker } from '../shared/placement'
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
}

export class EditSession {
  private active = false
  private selected: EditState['selected'] = null
  private history: History<Design> = createHistory(emptyDesign())

  constructor(private host: EditHost, private now: () => number = Date.now) {}

  get state(): EditState {
    return { active: this.active, selected: this.selected, canUndo: canUndo(this.history), canRedo: canRedo(this.history) }
  }

  setActive(on: boolean): void {
    if (on === this.active) return
    this.active = on
    this.selected = null
    if (on) {
      this.history = createHistory(structuredClone(this.host.data().design))
      this.host.show('designer')
    } else {
      this.host.hide('designer')
    }
    this.publish()
  }

  select(raw: unknown): void {
    if (!this.active) return
    if (raw === null) {
      this.selected = null
    } else {
      const next = parseSelection(raw, this.host.data().design.stickers)
      if (!next) return
      this.selected = next
    }
    this.publish()
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
    if (Object.keys(d.overrides).length + Object.keys(d.moves).length + d.stickers.length + Object.keys(d.backgrounds).length === 0) return
    this.commit(emptyDesign(), 'reset:all')
  }

  move(key: unknown, x: unknown, y: unknown): void {
    if (!this.active || typeof key !== 'string') return
    const d = this.host.data().design
    const moves = setMove(d.moves, key, { x, y })
    if (moves === d.moves) return
    this.commit({ ...d, moves }, `move:${key}`)
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
    const stickers = addSticker(d.stickers, draft, this.host.data().assets, id)
    if (!stickers) return
    this.selectSticker(id, stickers[stickers.length - 1].panel)
    this.commit({ ...d, stickers }, `sticker-add:${id}`)
  }

  updateSticker(id: unknown, patch: unknown): void {
    if (!this.active || typeof id !== 'string') return
    const d = this.host.data().design
    const stickers = updateSticker(d.stickers, id, patch, this.host.data().assets)
    if (stickers === d.stickers) return
    this.commit({ ...d, stickers }, `sticker:${id}`)
  }

  deleteSticker(id: unknown): void {
    if (!this.active || typeof id !== 'string') return
    const d = this.host.data().design
    const stickers = deleteSticker(d.stickers, id)
    if (stickers === d.stickers) return
    if (this.selected?.id === `sticker:${id}`) this.selected = null
    this.commit({ ...d, stickers }, `sticker-delete:${id}`)
  }

  duplicateSticker(id: unknown): void {
    if (!this.active || typeof id !== 'string') return
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
    const current = this.selected?.id
    if (current?.startsWith('sticker:') && !next.stickers.some((s) => `sticker:${s.id}` === current)) this.selected = null
    this.history = createHistory(next)
    this.write(next)
  }

  undo(): void {
    if (!this.active || !canUndo(this.history)) return
    this.history = undo(this.history)
    this.write(this.history.present)
  }

  redo(): void {
    if (!this.active || !canRedo(this.history)) return
    this.history = redo(this.history)
    this.write(this.history.present)
  }

  private selectSticker(id: string, panel: NonNullable<EditState['selected']>['panel']): void {
    this.selected = { id: `sticker:${id}`, panel, computed: { color: '', background: '', borderColor: '', radius: 0, borderWidth: 0, fontSize: 0, bold: false } }
  }

  private commit(next: Design, key: string): void {
    this.history = record(this.history, next, key, this.now())
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
