import { describe, it, expect } from 'vitest'
import { layoutDay, toMinutes } from './weekLayout'
import type { Occurrence } from './types'

const occ = (id: string, time: string, endTime?: string): Occurrence => ({
  task: { id, title: id, kind: 'daily', time, ...(endTime ? { endTime } : {}), createdOn: '2026-10-01' },
  date: '2026-10-05',
  done: false
})

describe('layoutDay', () => {
  it('converts times to minutes', () => {
    expect(toMinutes('00:00')).toBe(0)
    expect(toMinutes('09:30')).toBe(570)
  })

  it('splits tasks without a time into the all-day list', () => {
    const { untimed, blocks } = layoutDay([occ('a', ''), occ('b', '09:00')])
    expect(untimed.map((o) => o.task.id)).toEqual(['a'])
    expect(blocks.map((b) => b.occ.task.id)).toEqual(['b'])
  })

  it('uses the end time for the block length', () => {
    const [b] = layoutDay([occ('a', '09:00', '11:30')]).blocks
    expect([b.start, b.end]).toEqual([540, 690])
  })

  it('gives tasks with no end time a 30 minute block', () => {
    const [b] = layoutDay([occ('a', '09:00')]).blocks
    expect(b.end - b.start).toBe(30)
  })

  it('stretches very short tasks to the minimum block', () => {
    const [b] = layoutDay([occ('a', '09:00', '09:10')]).blocks
    expect(b.end - b.start).toBe(30)
  })

  it('clamps blocks at midnight', () => {
    const [b] = layoutDay([occ('a', '23:50')]).blocks
    expect(b.end).toBe(1440)
  })

  it('puts overlapping tasks side by side', () => {
    const { blocks } = layoutDay([occ('a', '09:00', '10:30'), occ('b', '10:00', '11:00')])
    expect(blocks.map((b) => [b.lane, b.lanes])).toEqual([[0, 2], [1, 2]])
  })

  it('reuses a lane once an earlier task has ended', () => {
    const { blocks } = layoutDay([occ('a', '09:00', '10:00'), occ('b', '09:30', '12:00'), occ('c', '10:00', '11:00')])
    const byId = Object.fromEntries(blocks.map((b) => [b.occ.task.id, b]))
    expect([byId.a.lane, byId.b.lane, byId.c.lane]).toEqual([0, 1, 0])
    expect(blocks.every((b) => b.lanes === 2)).toBe(true)
  })

  it('does not widen tasks that merely touch', () => {
    const { blocks } = layoutDay([occ('a', '09:00', '10:00'), occ('b', '10:00', '11:00')])
    expect(blocks.map((b) => [b.lane, b.lanes])).toEqual([[0, 1], [0, 1]])
  })

  it('keeps separate clusters independent', () => {
    const { blocks } = layoutDay([occ('a', '09:00', '10:00'), occ('b', '09:30', '10:30'), occ('c', '14:00', '15:00')])
    const c = blocks.find((b) => b.occ.task.id === 'c')!
    expect(c.lanes).toBe(1)
  })
})
