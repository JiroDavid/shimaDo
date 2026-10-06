import { describe, it, expect } from 'vitest'
import {
  ASSET_ID, MAX_ASSETS, MAX_ASSET_BYTES, MAX_TOTAL_BYTES, assetUrlFor, checkUpload, mimeFor, parseAssetUrl, sanitizeAssetName, sanitizeAssets, sniffAsset,
  type AssetInfo
} from './assets'

const pad = (head: number[], total: number) => {
  const a = new Uint8Array(total)
  a.set(head)
  return a
}
const png = () => pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 40)
const jpg = () => pad([0xff, 0xd8, 0xff, 0xe0], 40)
const gif = () => pad([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 30)
const webp = () => {
  const a = pad([0x52, 0x49, 0x46, 0x46], 40)
  a.set([0x57, 0x45, 0x42, 0x50], 8)
  return a
}
const text = (s: string) => new TextEncoder().encode(s)
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'

const info = (id: string, bytes = 100): AssetInfo => ({ id, ext: 'png', bytes, name: 'a', addedAt: 1 })

describe('sniffAsset', () => {
  it('still accepts a plain svg with styling and gradients', () => {
    const fancy = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/></linearGradient></defs><style>.a{fill:url(#g)}</style><rect class="a" width="10" height="10"/></svg>'
    expect(sniffAsset(text(fancy))).toBe('svg')
  })

  it('recognises real image bytes', () => {
    expect(sniffAsset(png())).toBe('png')
    expect(sniffAsset(jpg())).toBe('jpg')
    expect(sniffAsset(gif())).toBe('gif')
    expect(sniffAsset(pad([0x47, 0x49, 0x46, 0x38, 0x37, 0x61], 30))).toBe('gif')
    expect(sniffAsset(webp())).toBe('webp')
    expect(sniffAsset(text(SVG))).toBe('svg')
    expect(sniffAsset(text(`<?xml version="1.0"?>\n${SVG}`))).toBe('svg')
    expect(sniffAsset(text(`\uFEFF  ${SVG}`))).toBe('svg')
  })

  it.each([
    ['empty', () => new Uint8Array(0)],
    ['text', () => text('hello world, not an image at all')],
    ['html', () => text('<!doctype html><html><body>hi</body></html>')],
    ['executable', () => pad([0x4d, 0x5a], 64)],
    ['truncated png header', () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['truncated gif', () => text('GIF89')],
    ['riff that is not webp', () => pad([0x52, 0x49, 0x46, 0x46], 40)],
    ['svg with a script', () => text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ['svg with an event handler', () => text('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect/></svg>')],
    ['svg with a mixed-case event handler', () => text('<svg xmlns="http://www.w3.org/2000/svg"><rect OnClick = "x()"/></svg>')],
    ['svg with foreignObject', () => text('<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>hi</div></foreignObject></svg>')],
    ['svg with a javascript link', () => text('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:alert(1)"><rect/></a></svg>')],
    ['svg with an iframe', () => text('<svg xmlns="http://www.w3.org/2000/svg"><iframe src="x"></iframe></svg>')],
    ['svg with an embedded html data uri', () => text('<svg xmlns="http://www.w3.org/2000/svg"><image href="data:text/html;base64,PGgxPg=="/></svg>')],
    ['svg that never closes', () => text('<svg xmlns="http://www.w3.org/2000/svg"><rect/>')],
    ['xml that is not svg', () => text('<?xml version="1.0"?><note>hi</note>')]
  ])('rejects %s', (_name, make) => {
    expect(sniffAsset(make())).toBeNull()
  })
})

describe('checkUpload', () => {
  it('accepts a real image', () => {
    expect(checkUpload(png(), {})).toEqual({ ok: true, ext: 'png' })
  })

  it('rejects empty, oversize and non-image files with a clear message', () => {
    expect(checkUpload(new Uint8Array(0), {})).toMatchObject({ ok: false, error: expect.stringMatching(/empty/i) })
    expect(checkUpload(new Uint8Array(MAX_ASSET_BYTES + 1), {})).toMatchObject({ ok: false, error: expect.stringMatching(/8 MB/) })
    expect(checkUpload(text('nope nope nope nope nope nope'), {})).toMatchObject({ ok: false, error: expect.stringMatching(/not a PNG/i) })
  })

  it('enforces the asset count and total size', () => {
    const many: Record<string, AssetInfo> = {}
    for (let i = 0; i < MAX_ASSETS; i++) many[`asset-${String(i).padStart(4, '0')}`] = info(`asset-${String(i).padStart(4, '0')}`)
    expect(checkUpload(png(), many)).toMatchObject({ ok: false, error: expect.stringMatching(/limit/i) })
    const big = { 'asset-big-1': info('asset-big-1', MAX_TOTAL_BYTES - 10) }
    expect(checkUpload(png(), big)).toMatchObject({ ok: false, error: expect.stringMatching(/storage/i) })
  })
})

describe('sanitizeAssetName', () => {
  it.each([
    ['photo.png', 'photo.png'],
    ['C:\\Users\\me\\Pictures\\cat.gif', 'cat.gif'],
    ['/home/me/../x/dog.jpg', 'dog.jpg'],
    ['bad<name>;{}.png', 'badname.png'],
    ['  spaced  ', 'spaced'],
    ['', 'image'],
    [5, 'image'],
    [undefined, 'image']
  ])('turns %j into %j', (raw, expected) => {
    expect(sanitizeAssetName(raw)).toBe(expected)
  })

  it('caps the length', () => {
    expect(sanitizeAssetName('x'.repeat(200))).toHaveLength(60)
  })
})

describe('sanitizeAssets', () => {
  it('keeps valid entries and cleans names', () => {
    const raw = { 'asset-aaaa-1': { id: 'asset-aaaa-1', ext: 'gif', bytes: 1234.6, name: 'a/b<c>.gif', addedAt: 5 } }
    expect(sanitizeAssets(raw)).toEqual({ 'asset-aaaa-1': { id: 'asset-aaaa-1', ext: 'gif', bytes: 1235, name: 'bc.gif', addedAt: 5 } })
  })

  it('drops mismatched ids, bad extensions, bad sizes and prototype keys', () => {
    const raw = JSON.parse(
      '{"asset-aaaa-1":{"id":"other-id-123","ext":"png","bytes":5,"name":"x","addedAt":1},' +
        '"asset-bbbb-2":{"id":"asset-bbbb-2","ext":"exe","bytes":5,"name":"x","addedAt":1},' +
        '"asset-cccc-3":{"id":"asset-cccc-3","ext":"png","bytes":0,"name":"x","addedAt":1},' +
        '"asset-dddd-4":{"id":"asset-dddd-4","ext":"png","bytes":99999999,"name":"x","addedAt":1},' +
        '"__proto__":{"id":"__proto__","ext":"png","bytes":5,"name":"x","addedAt":1},' +
        '"../evil-1234":{"id":"../evil-1234","ext":"png","bytes":5,"name":"x","addedAt":1}}'
    )
    expect(sanitizeAssets(raw)).toEqual({})
  })

  it.each([null, undefined, 5, 'x', []])('returns empty for %j', (raw) => {
    expect(sanitizeAssets(raw)).toEqual({})
  })

  it('caps the number of assets', () => {
    const raw: Record<string, unknown> = {}
    for (let i = 0; i < MAX_ASSETS + 5; i++) {
      const id = `asset-${String(i).padStart(4, '0')}`
      raw[id] = { id, ext: 'png', bytes: 10, name: 'x', addedAt: 1 }
    }
    expect(Object.keys(sanitizeAssets(raw))).toHaveLength(MAX_ASSETS)
  })
})

describe('asset urls and mime types', () => {
  it('round-trips a valid id', () => {
    expect(assetUrlFor('abcd1234-ef56')).toBe('shimado-asset://asset/abcd1234-ef56')
    expect(parseAssetUrl('shimado-asset://asset/abcd1234-ef56')).toBe('abcd1234-ef56')
    expect(parseAssetUrl('shimado-asset://asset/abcd1234-ef56/')).toBe('abcd1234-ef56')
  })

  it.each([
    '', 'http://asset/abcd1234', 'shimado-asset://other/abcd1234', 'shimado-asset://asset/../etc/passwd', 'shimado-asset://asset/ABCD1234',
    'shimado-asset://asset/short', 'shimado-asset://asset/abcd1234/extra', 'shimado-asset://asset/abcd1234?x=1', 'shimado-asset://asset/abcd%2e%2e',
    'shimado-asset://asset/' + 'a'.repeat(41), 'shimado-asset://asset/abcd1234\u0000'
  ])('rejects %j', (url) => {
    expect(parseAssetUrl(url)).toBeNull()
  })

  it('maps extensions to mime types and ids to the id pattern', () => {
    expect(mimeFor('png')).toBe('image/png')
    expect(mimeFor('jpg')).toBe('image/jpeg')
    expect(mimeFor('gif')).toBe('image/gif')
    expect(mimeFor('svg')).toBe('image/svg+xml')
    expect(mimeFor('webp')).toBe('image/webp')
    expect(ASSET_ID.test('0f8fad5b-d9cb-469f-a165-70867728950e')).toBe(true)
  })
})
