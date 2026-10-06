export const ASSET_SCHEME = 'shimado-asset'
export const ASSET_EXTS = ['png', 'jpg', 'gif', 'svg', 'webp'] as const
export type AssetExt = (typeof ASSET_EXTS)[number]

export const MAX_ASSET_BYTES = 8 * 1024 * 1024
export const MAX_ASSETS = 40
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024
export const MAX_ASSET_NAME = 60
export const ASSET_ID = /^[a-z0-9-]{8,40}$/

export interface AssetInfo {
  id: string
  ext: AssetExt
  bytes: number
  name: string
  addedAt: number
}

export type AssetResult = { ok: true; id: string } | { ok: false; error: string }

const MIME: Record<AssetExt, string> = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp' }

export const mimeFor = (ext: AssetExt): string => MIME[ext]
export const isAssetExt = (v: unknown): v is AssetExt => typeof v === 'string' && (ASSET_EXTS as readonly string[]).includes(v)

const SVG_UNSAFE = [
  /<script[\s>]/i,
  /<foreignObject[\s>]/i,
  /<(?:iframe|embed|object|frame|link|meta|base)[\s>/]/i,
  /\son[a-z]+\s*=/i,
  /javascript\s*:/i,
  /(?:href|src)\s*=\s*["']?\s*data:\s*(?:text\/html|application\/(?:xhtml|xml|javascript))/i,
  /<!ENTITY/i,
  /&#/
]

export function sniffAsset(bytes: Uint8Array): AssetExt | null {
  const at = (sig: number[], offset = 0) => bytes.length >= offset + sig.length && sig.every((v, i) => bytes[offset + i] === v)
  if (bytes.length >= 33 && at([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (bytes.length >= 20 && at([0xff, 0xd8, 0xff])) return 'jpg'
  if (bytes.length >= 13 && (at([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || at([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))) return 'gif'
  if (bytes.length >= 30 && at([0x52, 0x49, 0x46, 0x46]) && at([0x57, 0x45, 0x42, 0x50], 8)) return 'webp'
  const head = new TextDecoder('utf-8').decode(bytes.subarray(0, 1024)).replace(/^﻿/, '').trimStart()
  if (!(head.startsWith('<svg') || head.startsWith('<?xml')) || !/<svg[\s>]/i.test(head)) return null
  const full = new TextDecoder('utf-8').decode(bytes)
  return /<\/svg\s*>/i.test(full) && !SVG_UNSAFE.some((re) => re.test(full)) ? 'svg' : null
}

export type UploadCheck = { ok: true; ext: AssetExt } | { ok: false; error: string }

export function checkUpload(bytes: Uint8Array, assets: Record<string, AssetInfo>): UploadCheck {
  if (bytes.length === 0) return { ok: false, error: 'That file is empty' }
  if (bytes.length > MAX_ASSET_BYTES) return { ok: false, error: 'That file is over 8 MB' }
  const list = Object.values(assets)
  if (list.length >= MAX_ASSETS) return { ok: false, error: `Image limit reached (${MAX_ASSETS}). Delete some first` }
  if (list.reduce((sum, a) => sum + a.bytes, 0) + bytes.length > MAX_TOTAL_BYTES) return { ok: false, error: 'Not enough image storage left (100 MB)' }
  const ext = sniffAsset(bytes)
  return ext ? { ok: true, ext } : { ok: false, error: 'That is not a PNG, JPG, GIF, SVG or WebP image' }
}

export function sanitizeAssetName(raw: unknown): string {
  const base = typeof raw === 'string' ? (raw.split(/[\\/]/).pop() ?? '') : ''
  const clean = base.replace(/[\u0000-\u001f\u007f<>{};:"|?*]/g, '').trim().slice(0, MAX_ASSET_NAME)
  return clean || 'image'
}

export function sanitizeAssets(raw: unknown): Record<string, AssetInfo> {
  const out: Record<string, AssetInfo> = {}
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out
  for (const [key, v] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_ASSETS) break
    if (!ASSET_ID.test(key) || typeof v !== 'object' || v === null) continue
    const r = v as Record<string, unknown>
    if (r.id !== key || !isAssetExt(r.ext)) continue
    if (typeof r.bytes !== 'number' || !Number.isFinite(r.bytes) || r.bytes < 1 || r.bytes > MAX_ASSET_BYTES) continue
    out[key] = {
      id: key,
      ext: r.ext,
      bytes: Math.round(r.bytes),
      name: sanitizeAssetName(r.name),
      addedAt: typeof r.addedAt === 'number' && Number.isFinite(r.addedAt) ? r.addedAt : 0
    }
  }
  return out
}

export const assetUrlFor = (id: string): string => `${ASSET_SCHEME}://asset/${id}`

const URL_PATTERN = new RegExp(`^${ASSET_SCHEME}://asset/([a-z0-9-]{8,40})/?$`)

export function parseAssetUrl(url: string): string | null {
  return URL_PATTERN.exec(url)?.[1] ?? null
}
