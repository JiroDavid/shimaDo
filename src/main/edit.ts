import type { AppData, EditState, PanelId } from '../shared/types'
import { clearOverride, emptyDesign, parseSelection, setOverride, type Design } from '../shared/design'
import { canRedo, canUndo, createHistory, record, redo, undo, type History } from '../shared/history'

export interface EditHost {
  data(): AppData
  update(fn: (d: AppData) => void): void
  show(id: PanelId): void
  hide(id: PanelId): void
  broadcast(channel: string, payload: unknown): void
  changed(): void
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
      const next = parseSelection(raw)
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
    const next = clearOverride(current, key)
    if (next === current) return
    this.commit(next, `reset:${key}`)
  }

  resetAll(): void {
    if (!this.active) return
    if (Object.keys(this.host.data().design.overrides).length === 0) return
    this.commit(emptyDesign(), 'reset:all')
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
