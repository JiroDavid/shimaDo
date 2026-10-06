import { describe, it, expect } from 'vitest'
import { ELEMENTS, GROUPS, GROUP_PREFIX, ID_PATTERN, EDITABLE_PANELS, PANEL_TITLES, elementById, groupById, isEditablePanel, isKnownKey } from './elements'

describe('element registry', () => {
  it('has unique element ids that are safe to put in a selector', () => {
    const ids = ELEMENTS.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(ID_PATTERN)
  })

  it('has unique group ids with simple single-class selectors', () => {
    const ids = GROUPS.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const g of GROUPS) {
      expect(g.id).toMatch(ID_PATTERN)
      expect(g.selector).toMatch(/^\.[a-z][a-z0-9-]*$/)
    }
  })

  it('only references groups that exist', () => {
    for (const e of ELEMENTS) if (e.group) expect(groupById(e.group), e.id).toBeDefined()
  })

  it('gives editable text elements a default label and nobody else', () => {
    for (const e of ELEMENTS) expect(e.props.includes('text'), e.id).toBe(e.defaultText !== undefined)
  })

  it('generates a window and a title element for every editable panel', () => {
    for (const p of EDITABLE_PANELS) {
      expect(elementById(`${p}.panel`)?.group).toBe('panel')
      expect(elementById(`${p}.title`)?.defaultText).toBe(PANEL_TITLES[p])
    }
  })

  it('looks things up by id and key', () => {
    expect(elementById('bar.label')?.defaultText).toBe('To-do')
    expect(elementById('nope')).toBeUndefined()
    expect(groupById('button')?.selector).toBe('.btn')
    expect(isKnownKey('bar.label')).toBe(true)
    expect(isKnownKey(`${GROUP_PREFIX}button`)).toBe(true)
    for (const bad of ['', 'nope', 'group:nope', '__proto__', 'group:', 'constructor', 'group:__proto__']) expect(isKnownKey(bad), bad).toBe(false)
  })

  it('knows which panels are editable', () => {
    expect(isEditablePanel('checklist')).toBe(true)
    for (const id of ['bar', 'mini', 'designer', 'nope']) expect(isEditablePanel(id), id).toBe(false)
  })

  it('orders button-primary after button so it wins', () => {
    const order = GROUPS.map((g) => g.id)
    expect(order.indexOf('button-primary')).toBeGreaterThan(order.indexOf('button'))
  })
})
