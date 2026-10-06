import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join, resolve, sep } from 'node:path'
import {
  ASSET_ID, MAX_ASSET_BYTES, checkUpload, isAssetExt, mimeFor, parseAssetUrl, sanitizeAssetName, sniffAsset,
  type AssetExt, type AssetInfo, type AssetResult
} from '../shared/assets'
import { sanitizeDesign } from '../shared/design'
import type { AppData } from '../shared/types'

export function resolveAssetPath(dir: string, id: unknown, ext: unknown): string | null {
  if (typeof id !== 'string' || !ASSET_ID.test(id) || !isAssetExt(ext)) return null
  const file = resolve(dir, `${id}.${ext}`)
  return file.startsWith(resolve(dir) + sep) ? file : null
}

export interface AssetHost {
  data(): AppData
  update(fn: (d: AppData) => void): void
}

const FILE_NAME = /^([a-z0-9-]{8,40})\.(png|jpg|gif|svg|webp)$/

const own = <T>(o: Record<string, T>, key: string): T | undefined => (Object.prototype.hasOwnProperty.call(o, key) ? o[key] : undefined)

export class AssetStore {
  constructor(
    private dir: string,
    private host: AssetHost,
    private now: () => number = Date.now,
    private newId: () => string = randomUUID
  ) {}

  init(): void {
    fs.mkdirSync(this.dir, { recursive: true })
    const index = this.host.data().assets
    for (const entry of fs.readdirSync(this.dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      const m = FILE_NAME.exec(entry.name)
      if (m && own(index, m[1])?.ext === m[2]) continue
      fs.rmSync(join(this.dir, entry.name), { force: true })
    }
    this.host.update((d) => {
      for (const [id, info] of Object.entries(d.assets)) {
        const file = resolveAssetPath(this.dir, id, info.ext)
        if (!file || !fs.existsSync(file)) delete d.assets[id]
      }
      d.design = sanitizeDesign(d.design, d.assets)
    })
  }

  add(name: unknown, bytes: Uint8Array): AssetResult {
    const check = checkUpload(bytes, this.host.data().assets)
    if (!check.ok) return check
    const id = this.newId()
    const file = resolveAssetPath(this.dir, id, check.ext)
    if (!file) return { ok: false, error: 'Could not store that file' }
    const tmp = `${file}.tmp`
    fs.mkdirSync(this.dir, { recursive: true })
    fs.writeFileSync(tmp, bytes)
    fs.renameSync(tmp, file)
    const info: AssetInfo = { id, ext: check.ext, bytes: bytes.length, name: sanitizeAssetName(name), addedAt: this.now() }
    this.host.update((d) => {
      d.assets[id] = info
    })
    return { ok: true, id }
  }

  remove(id: string): void {
    const info = own(this.host.data().assets, id)
    if (!info) return
    const file = resolveAssetPath(this.dir, id, info.ext)
    if (file) fs.rmSync(file, { force: true })
    this.host.update((d) => {
      delete d.assets[id]
    })
  }

  fileFor(id: string): { path: string; ext: AssetExt } | null {
    const info = typeof id === 'string' ? own(this.host.data().assets, id) : undefined
    if (!info) return null
    const file = resolveAssetPath(this.dir, id, info.ext)
    return file && fs.existsSync(file) ? { path: file, ext: info.ext } : null
  }

  readAll(): Record<string, Buffer> {
    const out: Record<string, Buffer> = {}
    for (const id of Object.keys(this.host.data().assets)) {
      const f = this.fileFor(id)
      if (f) out[id] = fs.readFileSync(f.path)
    }
    return out
  }

  replaceAll(files: Record<string, Uint8Array>): void {
    fs.mkdirSync(this.dir, { recursive: true })
    for (const entry of fs.readdirSync(this.dir, { withFileTypes: true })) if (entry.isFile()) fs.rmSync(join(this.dir, entry.name), { force: true })
    const index = this.host.data().assets
    for (const [id, bytes] of Object.entries(files)) {
      const info = own(index, id)
      const file = info ? resolveAssetPath(this.dir, id, info.ext) : null
      if (info && file && bytes.length <= MAX_ASSET_BYTES && sniffAsset(bytes) === info.ext) fs.writeFileSync(file, bytes)
    }
  }
}

export interface AssetResponse {
  status: number
  body?: Buffer
  headers?: Record<string, string>
}

export function serveAsset(store: AssetStore, url: string): AssetResponse {
  const id = parseAssetUrl(url)
  if (!id) return { status: 400 }
  const file = store.fileFor(id)
  if (!file) return { status: 404 }
  return {
    status: 200,
    body: fs.readFileSync(file.path),
    headers: {
      'content-type': mimeFor(file.ext),
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'cache-control': 'private, max-age=31536000, immutable'
    }
  }
}
