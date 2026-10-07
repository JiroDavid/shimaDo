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
    newId: () => `stk-test-${String(++ids).padStart(4, '0')}`,
    spawnPoint: (size, index) => ({ x: 800 - size / 2 + index * 28, y: 450 - size / 2 + index * 28 }),
    moveStickerToSpace: (id) => calls.push(`space:${id}`)
  }
  data.assets['asset-aaaa-1'] = { id: 'asset-aaaa-1', ext: 'png', bytes: 5, name: 'a', addedAt: 1 }
  return { data, calls, messages, removed, session: new EditSession(host, () => clock), tick: (ms: number) => { clock += ms } }
}

describe('EditSession', () => {
  it('starts inactive and toggles the designer window with the mode', () => {
    const { session, calls, messages } = setup()
    expect(session.state).toEqual({ active: false, selected: [], canUndo: false, canRedo: false, dom: {}, cropping: null, spaceClicks: 0 })
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
    session.select([selection])
    expect(session.state.selected[0]?.id).toBe('bar.label')
    session.setActive(false)
    expect(session.state.selected).toEqual([])
  })

  it('ignores selection while inactive and rejects invalid selections', () => {
    const { session } = setup()
    session.select([selection])
    expect(session.state.selected).toEqual([])
    session.setActive(true)
    session.select([{ id: 'nope', panel: 'bar', computed }])
    expect(session.state.selected).toEqual([])
    session.select([selection])
    session.select([{ id: 'nope', panel: 'bar', computed }])
    expect(session.state.selected[0]?.id).toBe('bar.label')
    session.select([])
    expect(session.state.selected).toEqual([])
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
      expect(session.state.selected[0]?.id).toBe('sticker:stk-test-0001')
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
      expect(session.state.selected[0]?.id).not.toBe('sticker:stk-test-0001')
    })

    it('selects a sticker only while it exists', () => {
      const { session } = setup()
      session.setActive(true)
      session.addSticker(draft)
      session.select([{ id: 'sticker:stk-test-0001', panel: 'checklist', computed: zero }])
      expect(session.state.selected[0]?.id).toBe('sticker:stk-test-0001')
      session.select([{ id: 'sticker:missing-sticker-9', panel: 'checklist', computed: zero }])
      expect(session.state.selected[0]?.id).toBe('sticker:stk-test-0001')
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

    it('reorders stickers in one undo step and only in Edit mode', () => {
      const { session, data } = setup()
      session.reorderSticker('stk-test-0001', 'forward')
      session.setActive(true)
      session.addSticker(draft)
      session.addSticker(draft)
      const [first, second] = data.design.stickers.map((s) => s.id)
      session.reorderSticker(first, 'forward')
      expect(data.design.stickers.map((s) => s.id)).toEqual([second, first])
      session.reorderSticker(first, 'forward')
      expect(data.design.stickers.map((s) => s.id)).toEqual([second, first])
      session.undo()
      expect(data.design.stickers.map((s) => s.id)).toEqual([first, second])
      session.reorderSticker(first, 7)
      session.reorderSticker(42, 'forward')
      expect(data.design.stickers.map((s) => s.id)).toEqual([first, second])
    })

    it('stores background scale and position and undoes them', () => {
      const { session, data } = setup()
      session.setActive(true)
      session.setBackground('checklist.panel', { asset: 'asset-aaaa-1', fit: 'cover', opacity: 1 })
      session.setBackground('checklist.panel', { asset: 'asset-aaaa-1', fit: 'cover', opacity: 1, scale: 2, x: 10, y: -5 })
      expect(data.design.backgrounds['checklist.panel']).toEqual({ asset: 'asset-aaaa-1', fit: 'cover', opacity: 1, scale: 2, x: 10, y: -5 })
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
      expect(session.state.selected).toEqual([])
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
      expect(data.design).toEqual({ overrides: {}, moves: {}, stickers: [], backgrounds: {}, order: {}, recentColors: [], presets: [] })
    })
  })
})

describe('EditSession desktop images', () => {
  const free = { panel: 'free', kind: 'image', asset: 'asset-aaaa-1', x: 0, y: 0, size: 200, layer: 'front', spawn: true }

  it('places a new desktop image at the screen spawn point, fanning out the next ones', () => {
    const { session, data } = setup()
    session.setActive(true)
    session.addSticker(free)
    session.addSticker(free)
    expect(data.design.stickers[0]).toMatchObject({ panel: 'free', x: 700, y: 350, size: 200 })
    expect(data.design.stickers[1]).toMatchObject({ x: 728, y: 378 })
  })

  it('keeps explicit coordinates for an image dropped on empty space', () => {
    const { session, data } = setup()
    session.setActive(true)
    session.addSticker({ ...free, spawn: undefined, x: -1200, y: 300 })
    expect(data.design.stickers[0]).toMatchObject({ panel: 'free', x: -1200, y: 300 })
  })

  it('clicking empty space deselects everything, leaves crop mode and counts the click', () => {
    const { session } = setup()
    session.setActive(true)
    session.addSticker(free)
    session.setCropping('stk-test-0001')
    expect(session.state.selected).toHaveLength(1)
    session.spaceClick()
    expect(session.state.selected).toEqual([])
    expect(session.state.cropping).toBeNull()
    expect(session.state.spaceClicks).toBe(1)
    session.spaceClick()
    expect(session.state.spaceClicks).toBe(2)
  })

  it('selects desktop images from the layers list, adding with ctrl and toggling off', () => {
    const { session } = setup()
    session.setActive(true)
    session.addSticker(free)
    session.addSticker(free)
    session.selectFree(['sticker:stk-test-0001'], false)
    expect(session.state.selected.map((s) => s.id)).toEqual(['sticker:stk-test-0001'])
    session.selectFree(['sticker:stk-test-0002'], true)
    expect(session.state.selected.map((s) => s.id)).toEqual(['sticker:stk-test-0001', 'sticker:stk-test-0002'])
    session.selectFree(['sticker:stk-test-0001'], true)
    expect(session.state.selected.map((s) => s.id)).toEqual(['sticker:stk-test-0002'])
    session.selectFree(['sticker:nope'], false)
    expect(session.state.selected).toEqual([])
  })

  it('lets desktop images be edited, moved and deleted without edit mode, without touching undo history', () => {
    const { session, data, tick } = setup()
    session.setActive(true)
    session.addSticker(free)
    session.setActive(false)
    tick(1000)
    session.updateSticker('stk-test-0001', { size: 300, rotation: 30 })
    session.moveFloat('stk-test-0001', 10, 20)
    expect(data.design.stickers[0]).toMatchObject({ size: 300, rotation: 30, x: 10, y: 20 })
    expect(session.state.canUndo).toBe(false)
    const menu = session.contextMenu('free', ['sticker:stk-test-0001'])
    expect(menu.map((e) => e.label)).toContain('Flip horizontal')
    session.deleteSticker('stk-test-0001')
    expect(data.design.stickers).toEqual([])
  })

  it('still refuses to edit window images or place anything outside edit mode', () => {
    const { session, data } = setup()
    session.setActive(true)
    session.addSticker({ ...free, panel: 'checklist', size: 80, spawn: undefined, x: 1, y: 2 })
    session.setActive(false)
    session.updateSticker('stk-test-0001', { size: 200 })
    expect(data.design.stickers[0].size).toBe(80)
    session.addSticker(free)
    expect(data.design.stickers).toHaveLength(1)
    expect(session.contextMenu('checklist', ['sticker:stk-test-0001'])).toEqual([])
  })

  it('moves a desktop image as one undo step', () => {
    const { session, data, tick } = setup()
    session.setActive(true)
    session.addSticker(free)
    tick(1000)
    session.moveFloat('stk-test-0001', -1500, 900)
    expect(data.design.stickers[0]).toMatchObject({ x: -1500, y: 900 })
    session.undo()
    expect(data.design.stickers[0]).toMatchObject({ x: 700, y: 350 })
  })

  it('docks a desktop image into a window and sends it back out again', () => {
    const { session, data, tick } = setup()
    session.setActive(true)
    session.addSticker(free)
    tick(1000)
    expect(session.moveStickerTo('stk-test-0001', 'checklist', 40, 90, 80)).toBe(true)
    expect(data.design.stickers[0]).toMatchObject({ panel: 'checklist', x: 40, y: 90, size: 80, layer: 'front' })
    tick(1000)
    expect(session.moveStickerTo('stk-test-0001', 'free', 900, 500, 160)).toBe(true)
    expect(data.design.stickers[0]).toMatchObject({ panel: 'free', x: 900, y: 500, size: 160 })
    expect(session.moveStickerTo('stk-test-0001', 'nowhere', 0, 0, 80)).toBe(false)
    expect(session.moveStickerTo('missing', 'checklist', 0, 0, 80)).toBe(false)
  })

  it('steps a desktop image forward and back from the menu, one place at a time', () => {
    const { session, data } = setup()
    session.setActive(true)
    session.addSticker(free)
    session.addSticker(free)
    const run = (label: string) => session.contextMenu('free', ['sticker:stk-test-0001']).find((e) => e.label === label)!.run!()
    run('Bring forward')
    expect(data.design.stickers.map((s) => s.id)).toEqual(['stk-test-0002', 'stk-test-0001'])
    run('Send backward')
    expect(data.design.stickers.map((s) => s.id)).toEqual(['stk-test-0001', 'stk-test-0002'])
  })

  it('offers move to empty space only for window images', () => {
    const { session, calls } = setup()
    session.setActive(true)
    session.addSticker({ ...free, panel: 'checklist', size: 80 })
    const inWindow = session.contextMenu('checklist', ['sticker:stk-test-0001'])
    inWindow.find((e) => e.label === 'Move to empty space')!.run!()
    expect(calls).toContain('space:stk-test-0001')
    session.addSticker(free)
    const onDesktop = session.contextMenu('free', ['sticker:stk-test-0002'])
    expect(onDesktop.map((e) => e.label)).not.toContain('Move to empty space')
    expect(onDesktop.map((e) => e.label)).not.toContain('Bring to front')
  })
})

describe('EditSession context menu', () => {
  const draft = { panel: 'checklist', kind: 'image', asset: 'asset-aaaa-1', x: 1, y: 2, size: 80, layer: 'front' }
  const labels = (list: { label?: string }[]) => list.map((e) => e.label ?? '-')

  it('layers an element from the menu one step at a time, to the front and to the back', () => {
    const { session, data } = setup()
    session.setActive(true)
    session.reportDom('checklist', ['checklist.title', 'checklist.heading', 'checklist.date'])
    const run = (label: string) => session.contextMenu('checklist', ['checklist.heading']).find((e) => e.label === label)!.run!()
    run('Bring forward')
    expect(data.design.order.checklist.slice(0, 3)).toEqual(['checklist.title', 'checklist.date', 'checklist.heading'])
    run('Send backward')
    expect(data.design.order.checklist.slice(0, 3)).toEqual(['checklist.title', 'checklist.heading', 'checklist.date'])
    run('Bring to front')
    expect(data.design.order.checklist[data.design.order.checklist.length - 1]).toBe('checklist.heading')
    run('Send to back')
    expect(data.design.order.checklist[0]).toBe('checklist.heading')
  })

  it('gives style groups such as task rows a menu too, so right-click never does nothing', () => {
    const { session, data } = setup()
    session.setActive(true)
    expect(labels(session.contextMenu('checklist', ['group:task-row']))).toEqual(['Reset style'])
    const menu = session.contextMenu('checklist', ['group:task-title'])
    expect(labels(menu)).toEqual(['Reset style', '-', 'Hide'])
    menu.find((e) => e.label === 'Hide')!.run!()
    expect(data.design.overrides['group:task-title'].hidden).toBe(true)
    session.contextMenu('checklist', ['group:task-title']).find((e) => e.label === 'Show')!.run!()
    expect(data.design.overrides['group:task-title'].hidden).toBe(false)
  })

  it('offers image actions for a selected image, with crop only for one image', () => {
    const { session } = setup()
    session.setActive(true)
    session.addSticker(draft)
    const menu = session.contextMenu('checklist', ['sticker:stk-test-0001'])
    expect(labels(menu)).toEqual(expect.arrayContaining(['Flip horizontal', 'Flip vertical', 'Rotate 90° right', 'Crop', 'Opacity', 'Corners', 'Reset image', 'Bring to front', 'Delete']))
    session.addSticker(draft)
    expect(labels(session.contextMenu('checklist', ['sticker:stk-test-0001', 'sticker:stk-test-0002']))).not.toContain('Crop')
  })

  it('runs the actions against the real design', () => {
    const { session, data, tick } = setup()
    session.setActive(true)
    session.addSticker(draft)
    tick(1000)
    const run = (label: string) => session.contextMenu('checklist', ['sticker:stk-test-0001']).find((e) => e.label === label)!.run!()
    run('Flip horizontal')
    expect(data.design.stickers[0].flipX).toBe(true)
    tick(1000)
    run('Rotate 90° right')
    expect(data.design.stickers[0].rotation).toBe(90)
    run('Crop')
    expect(session.state.cropping).toBe('stk-test-0001')
    const opacity = session.contextMenu('checklist', ['sticker:stk-test-0001']).find((e) => e.label === 'Opacity')!
    opacity.submenu!.find((e) => e.label === '50%')!.run!()
    expect(data.design.stickers[0].opacity).toBe(0.5)
    tick(1000)
    run('Delete')
    expect(data.design.stickers).toEqual([])
  })

  it('offers element actions for a selected element and nothing for unknown or inactive selections', () => {
    const { session } = setup()
    expect(session.contextMenu('checklist', ['checklist.card.overdue'])).toEqual([])
    session.setActive(true)
    const menu = session.contextMenu('checklist', ['checklist.card.overdue'])
    expect(labels(menu)).toEqual(['Bring to front', 'Bring forward', 'Send backward', 'Send to back', '-', 'Reset style', 'Reset position', 'Auto size', '-', 'Hide'])
    expect(session.contextMenu('checklist', ['nope'])).toEqual([])
    expect(session.contextMenu('checklist', 'x')).toEqual([])
  })
})

describe('EditSession images, cropping and element sizes', () => {
  const draft = { panel: 'checklist', kind: 'image', asset: 'asset-aaaa-1', x: 1, y: 2, size: 80, layer: 'front' }

  it('enters and leaves crop mode for an image, selecting it', () => {
    const { session } = setup()
    session.setActive(true)
    session.addSticker(draft)
    session.select([])
    session.setCropping('stk-test-0001')
    expect(session.state.cropping).toBe('stk-test-0001')
    expect(session.state.selected.map((s) => s.id)).toEqual(['sticker:stk-test-0001'])
    session.setCropping(null)
    expect(session.state.cropping).toBeNull()
  })

  it('refuses to crop emoji or unknown stickers and leaves crop mode when the selection moves on', () => {
    const { session } = setup()
    session.setActive(true)
    session.addSticker({ ...draft, kind: 'emoji', emoji: '🔥', asset: undefined })
    session.setCropping('stk-test-0001')
    expect(session.state.cropping).toBeNull()
    session.addSticker(draft)
    session.setCropping('stk-test-0002')
    session.select([{ id: 'checklist.title', panel: 'checklist', computed }])
    expect(session.state.cropping).toBeNull()
  })

  it('stores an element size and position in one undo step', () => {
    const { session, data } = setup()
    session.setActive(true)
    session.resizeElement('checklist.card.overdue', 200, 120, -10, 4)
    expect(data.design.overrides['checklist.card.overdue']).toMatchObject({ width: 200, height: 120 })
    expect(data.design.moves['checklist.card.overdue']).toEqual({ x: -10, y: 4 })
    session.undo()
    expect(data.design.overrides).toEqual({})
    expect(data.design.moves).toEqual({})
  })

  it('ignores sizes for windows and unknown keys', () => {
    const { session, data } = setup()
    session.setActive(true)
    session.resizeElement('checklist.panel', 200, 120, 0, 0)
    session.resizeElement('nope', 200, 120, 0, 0)
    expect(data.design.overrides).toEqual({})
  })

  it('remembers recent colours and keeps them and saved styles across undo and reset', () => {
    const { session, data, tick } = setup()
    session.setActive(true)
    session.patch('checklist.panel', { background: '#112233' })
    tick(1000)
    session.addRecentColor('#ABCDEF')
    session.savePreset('checklist', 'Night')
    expect(data.design.recentColors).toEqual(['#abcdef'])
    expect(data.design.presets).toHaveLength(1)
    session.undo()
    expect(data.design.overrides).toEqual({})
    expect(data.design.recentColors).toEqual(['#abcdef'])
    expect(data.design.presets).toHaveLength(1)
    session.resetAll()
    session.patch('checklist.panel', { background: '#000000' })
    session.resetAll()
    expect(data.design.recentColors).toEqual(['#abcdef'])
    expect(data.design.presets).toHaveLength(1)
  })

  it('applies a saved style to another window as one undo step', () => {
    const { session, data, tick } = setup()
    session.setActive(true)
    session.patch('checklist.panel', { background: '#112233', accent: '#ff0000' })
    session.savePreset('checklist', 'Night')
    tick(1000)
    const id = data.design.presets[0].id
    session.applyPreset(id, 'focus')
    expect(data.design.overrides['focus.panel']).toEqual({ background: '#112233', accent: '#ff0000' })
    session.undo()
    expect(data.design.overrides['focus.panel']).toBeUndefined()
    session.deletePreset(id)
    expect(data.design.presets).toEqual([])
  })
})

describe('EditSession selection and batching', () => {
  const a = { id: 'bar.label', panel: 'bar', computed }
  const b = { id: 'bar.exit', panel: 'bar', computed }
  const other = { id: 'checklist.title', panel: 'checklist', computed }

  it('holds several selected elements from one window and ignores ones from another', () => {
    const { session } = setup()
    session.setActive(true)
    session.select([a, b, other, a])
    expect(session.state.selected.map((s) => s.id)).toEqual(['bar.label', 'bar.exit'])
  })

  it('shows and hides the layers window with the designer', () => {
    const { session, calls } = setup()
    session.setActive(true)
    expect(calls).toContain('show:layers')
    session.setActive(false)
    expect(calls).toContain('hide:layers')
  })

  it('applies one patch to every key as a single undo step', () => {
    const { session, data } = setup()
    session.setActive(true)
    session.patchMany(['bar.label', 'bar.exit'], { color: '#112233' })
    expect(data.design.overrides['bar.label'].color).toBe('#112233')
    expect(data.design.overrides['bar.exit'].color).toBe('#112233')
    session.undo()
    expect(data.design.overrides).toEqual({})
  })

  it('updates several stickers at once and undoes them together', () => {
    const { session, data, tick } = setup()
    session.setActive(true)
    const draft = { panel: 'checklist', kind: 'emoji', emoji: '🔥', x: 1, y: 2, size: 40, layer: 'front' }
    session.addSticker(draft)
    tick(1000)
    session.addSticker(draft)
    tick(1000)
    session.updateStickers(['stk-test-0001', 'stk-test-0002'], { size: 90 })
    expect(data.design.stickers.map((s) => s.size)).toEqual([90, 90])
    session.undo()
    expect(data.design.stickers.map((s) => s.size)).toEqual([40, 40])
  })

  it('remembers the on-screen element order a window reports, and clears it when edit ends', () => {
    const { session, messages } = setup()
    session.setActive(true)
    session.reportDom('checklist', ['checklist.title', 'checklist.card.overdue'])
    expect(session.state.dom.checklist).toEqual(['checklist.title', 'checklist.card.overdue'])
    const before = messages.length
    session.reportDom('checklist', ['checklist.title', 'checklist.card.overdue'])
    expect(messages.length).toBe(before)
    session.setActive(false)
    expect(session.state.dom).toEqual({})
  })

  it('arranges an element in front of a sticker using the reported order', () => {
    const { session, data, tick } = setup()
    session.setActive(true)
    session.addSticker({ panel: 'checklist', kind: 'emoji', emoji: '🔥', x: 1, y: 2, size: 40, layer: 'front' })
    tick(1000)
    session.reportDom('checklist', ['checklist.card.done', 'checklist.card.overdue'])
    session.arrange('checklist', 'checklist.card.done', 'front', 'sticker:stk-test-0001')
    expect(data.design.order.checklist.slice(-2)).toEqual(['sticker:stk-test-0001', 'checklist.card.done'])
  })
})

