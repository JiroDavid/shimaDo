import { describe, it, expect } from 'vitest'
import { COALESCE_MS, HISTORY_LIMIT, canRedo, canUndo, createHistory, record, redo, undo } from './history'

describe('history', () => {
  it('starts empty', () => {
    const h = createHistory(0)
    expect(canUndo(h)).toBe(false)
    expect(canRedo(h)).toBe(false)
    expect(h.present).toBe(0)
  })

  it('records, undoes and redoes', () => {
    let h = createHistory(0)
    h = record(h, 1, 'a', 0)
    h = record(h, 2, 'b', 1000)
    expect(h.present).toBe(2)
    h = undo(h)
    expect(h.present).toBe(1)
    h = undo(h)
    expect(h.present).toBe(0)
    expect(canUndo(h)).toBe(false)
    h = redo(h)
    h = redo(h)
    expect(h.present).toBe(2)
    expect(canRedo(h)).toBe(false)
  })

  it('does nothing when there is nothing to undo or redo', () => {
    const h = createHistory(0)
    expect(undo(h)).toBe(h)
    expect(redo(h)).toBe(h)
  })

  it('clears redo after a new change', () => {
    let h = record(createHistory(0), 1, 'a', 0)
    h = record(h, 2, 'b', 1000)
    h = undo(h)
    expect(canRedo(h)).toBe(true)
    h = record(h, 9, 'c', 2000)
    expect(canRedo(h)).toBe(false)
    expect(h.present).toBe(9)
  })

  it('coalesces changes to the same key within the window into one step', () => {
    let h = createHistory(0)
    h = record(h, 1, 'radius', 0)
    h = record(h, 2, 'radius', COALESCE_MS - 1)
    h = record(h, 3, 'radius', COALESCE_MS * 2 - 2)
    expect(h.present).toBe(3)
    h = undo(h)
    expect(h.present).toBe(0)
    expect(canUndo(h)).toBe(false)
  })

  it('does not coalesce across keys or after the window', () => {
    let h = createHistory(0)
    h = record(h, 1, 'a', 0)
    h = record(h, 2, 'b', 10)
    h = record(h, 3, 'b', 10 + COALESCE_MS + 1)
    expect(undo(undo(undo(h))).present).toBe(0)
    expect(undo(h).present).toBe(2)
  })

  it('starts a fresh step after an undo', () => {
    let h = record(createHistory(0), 1, 'a', 0)
    h = undo(h)
    h = record(h, 5, 'a', 10)
    expect(undo(h).present).toBe(0)
  })

  it('caps the history', () => {
    let h = createHistory(0)
    for (let i = 1; i <= HISTORY_LIMIT + 5; i++) h = record(h, i, `k${i}`, i * 1000)
    expect(h.past).toHaveLength(HISTORY_LIMIT)
    expect(h.past[0]).toBe(5)
  })
})
