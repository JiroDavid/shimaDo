import type { AppData } from '../shared/types'
import { ASSET_ID, MAX_ASSETS, MAX_ASSET_BYTES, MAX_TOTAL_BYTES, sniffAsset } from '../shared/assets'
import { sanitizeDesign } from '../shared/design'
import { migrate } from './store'

const MARKER = 'shimado-backup'
const AVATAR_PREFIX = 'data:image/png;base64,'

export interface ParsedBackup {
  data: AppData
  avatar: string | null
  assetFiles: Record<string, Buffer>
}

export function buildBackup(data: AppData, avatar: string | null, assetFiles: Record<string, Uint8Array> = {}, now = new Date()): string {
  const encoded: Record<string, string> = {}
  for (const [id, bytes] of Object.entries(assetFiles)) encoded[id] = Buffer.from(bytes).toString('base64')
  return JSON.stringify({ app: MARKER, format: 1, exportedAt: now.toISOString(), data, avatar, assetFiles: encoded }, null, 2)
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
  const data = migrate(r.data)

  const encoded = typeof r.assetFiles === 'object' && r.assetFiles !== null && !Array.isArray(r.assetFiles) ? (r.assetFiles as Record<string, unknown>) : {}
  const assetFiles: Record<string, Buffer> = {}
  let total = 0
  for (const [id, info] of Object.entries(data.assets)) {
    if (Object.keys(assetFiles).length >= MAX_ASSETS || !ASSET_ID.test(id)) continue
    const b64 = Object.prototype.hasOwnProperty.call(encoded, id) ? encoded[id] : undefined
    if (typeof b64 !== 'string') continue
    const bytes = Buffer.from(b64, 'base64')
    if (bytes.length === 0 || bytes.length > MAX_ASSET_BYTES || total + bytes.length > MAX_TOTAL_BYTES || sniffAsset(bytes) !== info.ext) continue
    total += bytes.length
    assetFiles[id] = bytes
  }
  data.assets = Object.fromEntries(
    Object.entries(data.assets)
      .filter(([id]) => Object.prototype.hasOwnProperty.call(assetFiles, id))
      .map(([id, info]) => [id, { ...info, bytes: assetFiles[id].length }])
  )
  data.design = sanitizeDesign(data.design, data.assets)
  return { data, avatar, assetFiles }
}

export function avatarBytes(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.slice(AVATAR_PREFIX.length), 'base64')
}
