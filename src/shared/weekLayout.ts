import type { Occurrence } from './types'

export const DEFAULT_BLOCK_MIN = 30
const DAY_MIN = 1440

export const toMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export interface Block {
  occ: Occurrence
  start: number
  end: number
  lane: number
  lanes: number
}

export function layoutDay(occs: Occurrence[]): { untimed: Occurrence[]; blocks: Block[] } {
  const untimed = occs.filter((o) => !o.task.time)
  const timed = occs
    .filter((o) => o.task.time)
    .map((occ) => {
      const start = toMinutes(occ.task.time)
      const wanted = occ.task.endTime ? toMinutes(occ.task.endTime) : start + DEFAULT_BLOCK_MIN
      const end = Math.min(DAY_MIN, Math.max(wanted, start + DEFAULT_BLOCK_MIN))
      return { occ, start, end, lane: 0, lanes: 1 }
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const blocks: Block[] = []
  let cluster: Block[] = []
  let clusterEnd = 0
  let laneEnds: number[] = []

  const flush = () => {
    for (const b of cluster) b.lanes = laneEnds.length
    blocks.push(...cluster)
    cluster = []
    laneEnds = []
  }

  for (const b of timed) {
    if (cluster.length > 0 && b.start >= clusterEnd) flush()
    let lane = laneEnds.findIndex((end) => end <= b.start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = b.end
    b.lane = lane
    cluster.push(b)
    clusterEnd = Math.max(clusterEnd, b.end)
  }
  flush()
  return { untimed, blocks }
}
