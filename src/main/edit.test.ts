import { describe, it, expect } from 'vitest'
import { EditSession, type EditHost } from './edit'
import { defaultData } from './store'
import type { PanelId } from '../shared/types'

const computed = { color: 'rgb(243, 233, 214)', background: 'rgba(0, 0, 0, 0)', borderColor: 'rgb(1, 2, 3)', radius: 12, borderWidth: 2, fontSize: 16, bold: false }
const selection = { id: 'bar.label', panel: 'bar', computed }

function setup() {
  const data = defaultData()
  const calls: string[] = []
  const messages: [string, unknown][] = []
  let clock = 0
  const host: EditHost = {
    data: () => data,
    update: (fn) => fn(data),
    show: (id: PanelId) => calls.push(`show:${id}`),
    hide: (id: PanelId) => calls.push(`hide:${id}`),
    broadcast: (channel, payload) => messages.push([channel, payload]),
    changed: () => calls.push('changed')
  }
  return { data, calls, messages, session: new EditSession(host, () => clock), tick: (ms: number) => { clock += ms } }
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
    data.design = { overrides: { 'bar.label': { color: '#abcdef' } } }
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
})
