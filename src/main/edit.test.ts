import { describe, it, expect } from 'vitest'
import { EditSession, type EditHost } from './edit'
import { defaultData } from './store'
import type { PanelId } from '../shared/types'

const computed = { color: 'rgb(243, 233, 214)', background: 'rgba(0, 0, 0, 0)', borderColor: 'rgb(1, 2, 3)', radius: 12, borderWidth: 2, fontSize: 16, bold: false }
const selection = { id: 'bar.label', panel: 'bar', computed }

function setup() {
  const data = defaultData()
  let ids = 0
  const removed: string[] = []
  const calls: string[] = []
  const messages: [string, unknown][] = []
  let clock = 0
  const host: EditHost = {
    data: () => data,
    update: (fn) => fn(data),
    show: (id: PanelId) => calls.push(`show:${id}`),
    hide: (id: PanelId) => calls.push(`hide:${id}`),
    broadcast: (channel, payload) => messages.push([channel, payload]),
    changed: () => calls.push('changed'),
    removeAsset: (id) => {
      removed.push(id)
      delete data.assets[id]
    },
    newId: () => `stk-test-${String(++ids).padStart(4, '0')}`
  }
  data.assets['asset-aaaa-1'] = { id: 'asset-aaaa-1', ext: 'png', bytes: 5, name: 'a', addedAt: 1 }
  return { data, calls, messages, removed, session: new EditSession(host, () => clock), tick: (ms: number) => { clock += ms } }
}

describe('EditSession', () => {
  it('starts inactive and toggles the designer window with the mode', () => {
    const { session, calls, messages } = setup()
    expect(session.state).toEqual({ active: false, selected: null, canUndo: false, canRedo: false })
    session.setActive(true)
    expect(session.state.active).toBe(true)
    expect(calls).toContain('show:designer')
    expect(messages.some(([c, p]) => c === 'edit:state' && (p as { active: boolean }).active)).toBe(true)
    session.setActive(false)
    expect(session.state.active).toBe(false)
    expect(calls).toContain('hide:designer')
  })

  it('clears the selection when edit mode ends', () => {
    const { session } = setup()
    session.setActive(true)
    session.select(selection)
    expect(session.state.selected?.id).toBe('bar.label')
    session.setActive(false)
    expect(session.state.selected).toBeNull()
  })

  it('ignores selection while inactive and rejects invalid selections', () => {
    const { session } = setup()
    session.select(selection)
    expect(session.state.selected).toBeNull()
    session.setActive(true)
    session.select({ id: 'nope', panel: 'bar', computed })
    expect(session.state.selected).toBeNull()
    session.select(selection)
    session.select({ id: 'nope', panel: 'bar', computed })
    expect(session.state.selected?.id).toBe('bar.label')
    session.select(null)
    expect(session.state.selected).toBeNull()
  })

  it('ignores patches while inactive and for unknown keys', () => {
    const { session, data } = setup()
    session.patch('bar.label', { color: '#ff0000' })
    expect(data.design.overrides).toEqual({})
    session.setActive(true)
    session.patch('nope', { color: '#ff0000' })
    session.patch(5, { color: '#ff0000' })
    expect(data.design.overrides).toEqual({})
  })

  it('applies a valid patch to the data and broadcasts it', () => {
    const { session, data, messages } = setup()
    session.setActive(true)
    session.patch('bar.label', { color: '#ff0000', radius: 99999 })
    expect(data.design.overrides).toEqual({ 'bar.label': { color: '#ff0000' } })
    expect(messages.some(([c]) => c === 'data:changed')).toBe(true)
    expect(session.state.canUndo).toBe(true)
  })

  it('undoes and redoes in order', () => {
    const { session, data, tick } = setup()
    session.setActive(true)
    session.patch('bar.label', { color: '#111111' })
    tick(1000)
    session.patch('bar.label', { color: '#222222' })
    session.undo()
    expect(data.design.overrides['bar.label']).toEqual({ color: '#111111' })
    session.undo()
    expect(data.design.overrides).toEqual({})
    expect(session.state.canUndo).toBe(false)
    expect(session.state.canRedo).toBe(true)
    session.redo()
    session.redo()
    expect(data.design.overrides['bar.label']).toEqual({ color: '#222222' })
  })

  it('coalesces rapid changes to one key into a single undo step', () => {
    const { session, data, tick } = setup()
    session.setActive(true)
    session.patch('bar.label', { fontSize: 20 })
    tick(100)
    session.patch('bar.label', { fontSize: 24 })
    tick(100)
    session.patch('bar.label', { fontSize: 28 })
    session.undo()
    expect(data.design.overrides).toEqual({})
  })

  it('clears redo after a new change', () => {
    const { session, tick } = setup()
    session.setActive(true)
    session.patch('bar.label', { color: '#111111' })
    tick(1000)
    session.undo()
    expect(session.state.canRedo).toBe(true)
    session.patch('bar.label', { color: '#333333' })
    expect(session.state.canRedo).toBe(false)
  })

  it('resets one element or everything, and both can be undone', () => {
    const { session, data, tick } = setup()
    session.setActive(true)
    session.patch('bar.label', { color: '#111111' })
    tick(1000)
    session.patch('group:button', { radius: 4 })
    tick(1000)
    session.reset('bar.label')
    expect(data.design.overrides).toEqual({ 'group:button': { radius: 4 } })
    tick(1000)
    session.resetAll()
    expect(data.design.overrides).toEqual({})
    session.undo()
    expect(data.design.overrides).toEqual({ 'group:button': { radius: 4 } })
  })

  it('starts a fresh history each time edit mode begins', () => {
    const { session, data } = setup()
    data.design = { ...data.design, overrides: { 'bar.label': { color: '#abcdef' } } }
    session.setActive(true)
    expect(session.state.canUndo).toBe(false)
    session.setActive(false)
    session.setActive(true)
    expect(session.state.canUndo).toBe(false)
  })

  it('does not touch history when a patch changes nothing', () => {
    const { session, tick } = setup()
    session.setActive(true)
    session.patch('bar.label', { color: '#111111' })
    tick(1000)
    session.undo()
    expect(session.state.canRedo).toBe(true)
    session.patch('bar.label', { text: 'a;b' })
    session.patch('bar.label', { color: null })
    expect(session.state.canRedo).toBe(true)
    expect(session.state.canUndo).toBe(false)
  })

  describe('placement', () => {
    const draft = { panel: 'checklist', kind: 'emoji', emoji: '🔥', x: 10, y: 20, size: 64, layer: 'front' }
    const zero = { color: '', background: '', borderColor: '', radius: 0, borderWidth: 0, fontSize: 0, bold: false }

    it('moves a movable element, coalesces drags and can undo', () => {
      const { session, data, tick } = setup()
      session.setActive(true)
      session.move('bar.label', 10, 5)
      tick(100)
      session.move('bar.label', 40, 15)
      expect(data.design.moves).toEqual({ 'bar.label': { x: 40, y: 15 } })
      session.undo()
      expect(data.design.moves).toEqual({})
    })

    it('ignores moves while inactive and for surfaces, unknown keys and bad values', () => {
      const { session, data } = setup()
      session.move('bar.label', 10, 5)
      expect(data.design.moves).toEqual({})
      session.setActive(true)
      for (const key of ['checklist.panel', 'bar.surface', 'group:button', 'nope', 5]) session.move(key, 10, 5)
      session.move('bar.label', 'a', 5)
      expect(data.design.moves).toEqual({})
    })

    it('resets one position', () => {
      const { session, data } = setup()
      session.setActive(true)
      session.move('bar.label', 10, 5)
      session.resetPosition('bar.label')
      expect(data.design.moves).toEqual({})
    })

    it('adds a sticker, selects it and rejects bad ones', () => {
      const { session, data } = setup()
      session.setActive(true)
      session.addSticker(draft)
      expect(data.design.stickers).toHaveLength(1)
      expect(data.design.stickers[0]).toMatchObject({ id: 'stk-test-0001', emoji: '🔥' })
      expect(session.state.selected?.id).toBe('sticker:stk-test-0001')
      session.addSticker({ ...draft, emoji: 'nope' })
      session.addSticker({ ...draft, kind: 'image', emoji: undefined, asset: 'missing-asset-1' })
      expect(data.design.stickers).toHaveLength(1)
    })

    it('adds an image sticker for an existing asset', () => {
      const { session, data } = setup()
      session.setActive(true)
      session.addSticker({ panel: 'bar', kind: 'image', asset: 'asset-aaaa-1', x: 1, y: 2, size: 48, layer: 'behind' })
      expect(data.design.stickers[0]).toMatchObject({ kind: 'image', asset: 'asset-aaaa-1', panel: 'bar' })
    })

    it('updates, duplicates and deletes a sticker', () => {
      const { session, data, tick } = setup()
      session.setActive(true)
      session.addSticker(draft)
      tick(1000)
      session.updateSticker('stk-test-0001', { x: 100, size: 80 })
      expect(data.design.stickers[0]).toMatchObject({ x: 100, size: 80 })
      session.duplicateSticker('stk-test-0001')
      expect(data.design.stickers).toHaveLength(2)
      session.deleteSticker('stk-test-0001')
      expect(data.design.stickers.map((s) => s.id)).toEqual(['stk-test-0002'])
      expect(session.state.selected?.id).not.toBe('sticker:stk-test-0001')
    })

    it('selects a sticker only while it exists', () => {
      const { session } = setup()
      session.setActive(true)
      session.addSticker(draft)
      session.select({ id: 'sticker:stk-test-0001', panel: 'checklist', computed: zero })
      expect(session.state.selected?.id).toBe('sticker:stk-test-0001')
      session.select({ id: 'sticker:missing-sticker-9', panel: 'checklist', computed: zero })
      expect(session.state.selected?.id).toBe('sticker:stk-test-0001')
    })

    it('sets and clears a background only on window surfaces', () => {
      const { session, data } = setup()
      session.setActive(true)
      session.setBackground('checklist.panel', { asset: 'asset-aaaa-1', fit: 'cover', opacity: 1 })
      session.setBackground('bar.label', { asset: 'asset-aaaa-1', fit: 'cover', opacity: 1 })
      expect(Object.keys(data.design.backgrounds)).toEqual(['checklist.panel'])
      session.setBackground('checklist.panel', null)
      expect(data.design.backgrounds).toEqual({})
    })

    it('deleting an image removes what uses it, resets undo and asks the host to remove the file', () => {
      const { session, data, removed } = setup()
      session.setActive(true)
      session.addSticker({ panel: 'bar', kind: 'image', asset: 'asset-aaaa-1', x: 1, y: 2, size: 48, layer: 'front' })
      session.setBackground('bar.surface', { asset: 'asset-aaaa-1', fit: 'cover', opacity: 1 })
      session.deleteAsset('asset-aaaa-1')
      expect(removed).toEqual(['asset-aaaa-1'])
      expect(data.design.stickers).toEqual([])
      expect(data.design.backgrounds).toEqual({})
      expect(session.state.canUndo).toBe(false)
      expect(session.state.selected).toBeNull()
    })

    it('ignores deleting an asset that does not exist or while inactive', () => {
      const { session, removed } = setup()
      session.deleteAsset('asset-aaaa-1')
      session.setActive(true)
      session.deleteAsset('missing-asset-1')
      expect(removed).toEqual([])
    })

    it('reset element clears its move and reset everything clears all placement', () => {
      const { session, data, tick } = setup()
      session.setActive(true)
      session.move('bar.label', 10, 5)
      session.patch('bar.label', { color: '#ff0000' })
      session.addSticker(draft)
      session.setBackground('checklist.panel', { asset: 'asset-aaaa-1', fit: 'cover', opacity: 1 })
      tick(1000)
      session.reset('bar.label')
      expect(data.design.moves).toEqual({})
      expect(data.design.overrides).toEqual({})
      tick(1000)
      session.resetAll()
      expect(data.design).toEqual({ overrides: {}, moves: {}, stickers: [], backgrounds: {} })
    })
  })
})
