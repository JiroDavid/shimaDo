import type { AppData } from '../shared/types'
import { migrate } from './store'

const MARKER = 'shimado-backup'
const AVATAR_PREFIX = 'data:image/png;base64,'

export interface ParsedBackup {
  data: AppData
  avatar: string | null
}

export function buildBackup(data: AppData, avatar: string | null, now = new Date()): string {
  return JSON.stringify({ app: MARKER, format: 1, exportedAt: now.toISOString(), data, avatar }, null, 2)
}

export function parseBackup(text: string): ParsedBackup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON')
  }
  if (typeof raw !== 'object' || raw === null) throw new Error('That is not a ShimaDo backup')
  const r = raw as Record<string, unknown>
  if (r.app !== MARKER) throw new Error('That is not a ShimaDo backup')
  if (r.format !== 1) throw new Error(`Unsupported backup format ${String(r.format)}`)
  const avatar = typeof r.avatar === 'string' && r.avatar.startsWith(AVATAR_PREFIX) ? r.avatar : null
  return { data: migrate(r.data), avatar }
}

export function avatarBytes(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.slice(AVATAR_PREFIX.length), 'base64')
}
