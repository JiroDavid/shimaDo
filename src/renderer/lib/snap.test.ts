import { describe, it, expect } from 'vitest'
import { boxLines, snapDelta } from './snap'

const box = { left: 100, top: 100, width: 40, height: 40 }
const targets = { xs: [0, 200, 400], ys: [0, 150, 300] }

describe('snapDelta', () => {
  it('snaps the centre of the box to a nearby line', () => {
    const r = snapDelta(box, { dx: 77, dy: 0 }, targets)
    expect(r.guideX).toBe(200)
    expect(r.dx).toBe(80)
  })

  it('snaps an edge as well as the centre', () => {
    const r = snapDelta(box, { dx: 62, dy: 0 }, { xs: [200], ys: [] })
    expect(r.dx).toBe(60)
    expect(r.guideX).toBe(200)
  })

  it('leaves the move alone when nothing is close', () => {
    expect(snapDelta(box, { dx: 30, dy: 20 }, targets)).toEqual({ dx: 30, dy: 20, guideX: null, guideY: null })
  })

  it('snaps each axis independently', () => {
    const r = snapDelta(box, { dx: 77, dy: 40 }, targets)
    expect(r.guideX).toBe(200)
    expect(r.guideY).toBeNull()
    expect(r.dy).toBe(40)
  })

  it('picks the closest line', () => {
    const r = snapDelta(box, { dx: 77, dy: 0 }, { xs: [190, 200], ys: [] })
    expect(r.guideX).toBe(200)
  })
})

describe('boxLines', () => {
  it('gives start, middle and end on each axis', () => {
    expect(boxLines(box)).toEqual({ xs: [100, 120, 140], ys: [100, 120, 140] })
  })
})
