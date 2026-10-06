import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { AssetStore, resolveAssetPath, serveAsset } from './assets'
import { Store } from './store'
import { MAX_ASSETS, MAX_ASSET_BYTES, type AssetInfo } from '../shared/assets'

const png = () => {
  const a = new Uint8Array(40)
  a.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return a
}

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shimado-assets-'))
  const dir = path.join(root, 'assets')
  const store = new Store(path.join(root, 'data.json'))
  let n = 0
  const assets = new AssetStore(dir, { data: () => store.data, update: (fn) => store.update(fn) }, () => 1000, () => `asset-test-${String(++n).padStart(4, '0')}`)
  assets.init()
  return { root, dir, store, assets }
}

describe('resolveAssetPath', () => {
  const dir = path.join(os.tmpdir(), 'shimado-assets-fixed')
  it('resolves a valid id and extension inside the folder', () => {
    expect(resolveAssetPath(dir, 'asset-aaaa-1', 'png')).toBe(path.join(dir, 'asset-aaaa-1.png'))
  })
  it.each([
    ['../etc/passwd', 'png'], ['..', 'png'], ['asset/aaaa-1', 'png'], ['asset\\aaaa-1', 'png'], ['ASSET-AAAA-1', 'png'], ['short', 'png'],
    ['asset-aaaa-1\u0000', 'png'], ['C:asset-aaaa', 'png'], ['asset-aaaa-1', 'exe'], ['asset-aaaa-1', ''], ['asset-aaaa-1', '../png'], [5, 'png'], ['asset-aaaa-1', undefined]
  ])('rejects id %j with extension %j', (id, ext) => {
    expect(resolveAssetPath(dir, id, ext)).toBeNull()
  })
})

describe('AssetStore.add', () => {
  it('stores a real image and indexes it', () => {
    const { assets, store, dir } = setup()
    const r = assets.add('C:\\pics\\cat<1>.png', png())
    expect(r).toEqual({ ok: true, id: 'asset-test-0001' })
    expect(fs.existsSync(path.join(dir, 'asset-test-0001.png'))).toBe(true)
    expect(store.data.assets['asset-test-0001']).toEqual({ id: 'asset-test-0001', ext: 'png', bytes: 40, name: 'cat1.png', addedAt: 1000 })
    expect(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp'))).toEqual([])
  })

  it('refuses non-images and writes nothing', () => {
    const { assets, store, dir } = setup()
    expect(assets.add('x.png', new TextEncoder().encode('MZ not an image at all, just text'))).toMatchObject({ ok: false })
    expect(assets.add('x.png', new Uint8Array(0))).toMatchObject({ ok: false })
    expect(fs.readdirSync(dir)).toEqual([])
    expect(store.data.assets).toEqual({})
  })

  it('refuses oversize files and a full library', () => {
    const { assets, store } = setup()
    expect(assets.add('big.png', new Uint8Array(MAX_ASSET_BYTES + 1))).toMatchObject({ ok: false })
    for (let i = 0; i < MAX_ASSETS; i++) store.data.assets[`asset-full-${String(i).padStart(4, '0')}`] = { id: `asset-full-${String(i).padStart(4, '0')}`, ext: 'png', bytes: 10, name: 'x', addedAt: 1 }
    expect(assets.add('one.png', png())).toMatchObject({ ok: false })
  })
})

describe('AssetStore.remove and fileFor', () => {
  it('removes the file and the index entry', () => {
    const { assets, store, dir } = setup()
    assets.add('a.png', png())
    expect(assets.fileFor('asset-test-0001')?.path).toBe(path.join(dir, 'asset-test-0001.png'))
    assets.remove('asset-test-0001')
    expect(fs.existsSync(path.join(dir, 'asset-test-0001.png'))).toBe(false)
    expect(store.data.assets).toEqual({})
    expect(assets.fileFor('asset-test-0001')).toBeNull()
  })

  it('ignores unknown and malicious ids', () => {
    const { assets, root } = setup()
    fs.writeFileSync(path.join(root, 'secret.txt'), 'secret')
    for (const id of ['../secret', '..', 'nope', '', 'asset-test-9999']) {
      assets.remove(id)
      expect(assets.fileFor(id)).toBeNull()
    }
    expect(fs.existsSync(path.join(root, 'secret.txt'))).toBe(true)
  })
})

describe('AssetStore.init', () => {
  it('deletes files that are not in the index, drops index entries with no file, and cleans stickers', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shimado-assets-'))
    const dir = path.join(root, 'assets')
    fs.mkdirSync(dir)
    fs.writeFileSync(path.join(dir, 'asset-keep-0001.png'), png())
    fs.writeFileSync(path.join(dir, 'asset-orphan-02.png'), png())
    fs.writeFileSync(path.join(dir, 'asset-keep-0001.png.tmp'), png())
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'x')
    fs.mkdirSync(path.join(dir, 'subfolder'))
    fs.writeFileSync(path.join(root, 'outside.txt'), 'x')
    const store = new Store(path.join(root, 'data.json'))
    const info = (id: string): AssetInfo => ({ id, ext: 'png', bytes: 40, name: 'x', addedAt: 1 })
    store.data.assets = { 'asset-keep-0001': info('asset-keep-0001'), 'asset-lost-0003': info('asset-lost-0003') }
    store.data.design.stickers = [
      { id: 'stk-aaaa-0001', panel: 'bar', kind: 'image', asset: 'asset-keep-0001', x: 1, y: 1, size: 40, layer: 'front' },
      { id: 'stk-bbbb-0002', panel: 'bar', kind: 'image', asset: 'asset-lost-0003', x: 1, y: 1, size: 40, layer: 'front' }
    ]
    new AssetStore(dir, { data: () => store.data, update: (fn) => store.update(fn) }).init()
    expect(fs.readdirSync(dir).sort()).toEqual(['asset-keep-0001.png', 'subfolder'])
    expect(Object.keys(store.data.assets)).toEqual(['asset-keep-0001'])
    expect(store.data.design.stickers.map((s) => s.id)).toEqual(['stk-aaaa-0001'])
    expect(fs.existsSync(path.join(root, 'outside.txt'))).toBe(true)
  })
})

describe('AssetStore.readAll and replaceAll', () => {
  it('round-trips files', () => {
    const a = setup()
    a.assets.add('a.png', png())
    const files = a.assets.readAll()
    expect(Object.keys(files)).toEqual(['asset-test-0001'])
    const b = setup()
    b.store.data.assets = { ...a.store.data.assets }
    b.assets.replaceAll(files)
    expect(fs.readdirSync(b.dir)).toEqual(['asset-test-0001.png'])
  })
})

describe('serveAsset', () => {
  it('serves a stored image with its type, no sniffing and a sandboxing policy', () => {
    const { assets } = setup()
    assets.add('a.png', png())
    const r = serveAsset(assets, 'shimado-asset://asset/asset-test-0001')
    expect(r.status).toBe(200)
    expect(r.body?.length).toBe(40)
    expect(r.headers?.['content-type']).toBe('image/png')
    expect(r.headers?.['x-content-type-options']).toBe('nosniff')
    expect(r.headers?.['content-security-policy']).toBe("default-src 'none'; style-src 'unsafe-inline'; sandbox")
  })

  it('refuses bad urls and unknown ids', () => {
    const { assets } = setup()
    expect(serveAsset(assets, 'shimado-asset://asset/..%2f..%2fetc').status).toBe(400)
    expect(serveAsset(assets, 'shimado-asset://asset/../x').status).toBe(400)
    expect(serveAsset(assets, 'file:///etc/passwd').status).toBe(400)
    expect(serveAsset(assets, 'shimado-asset://asset/asset-zzzz-9999').status).toBe(404)
  })
})
