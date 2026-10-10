import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createTokenStore } from './tokenStore'

const safe = (available = true) => ({
  isEncryptionAvailable: () => available,
  encryptString: (s: string) => Buffer.from(`enc:${s}`),
  decryptString: (b: Buffer) => {
    const t = b.toString()
    if (!t.startsWith('enc:')) throw new Error('bad')
    return t.slice(4)
  }
})
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shima-tok-')), 'spotify-token.bin')

describe('createTokenStore', () => {
  it('round-trips the refresh token and scope', () => {
    const store = createTokenStore(tmp(), safe())
    store.save({ refresh: 'r1', scope: 'a b' })
    expect(store.load()).toEqual({ refresh: 'r1', scope: 'a b' })
  })
  it('reads a legacy plain-string token as a login with no scope', () => {
    const file = tmp()
    fs.writeFileSync(file, Buffer.from('enc:legacy-refresh'))
    expect(createTokenStore(file, safe()).load()).toEqual({ refresh: 'legacy-refresh', scope: '' })
  })
  it('returns null for missing, corrupt or empty content and when encryption is unavailable', () => {
    const file = tmp()
    expect(createTokenStore(file, safe()).load()).toBeNull()
    fs.writeFileSync(file, 'not encrypted')
    expect(createTokenStore(file, safe()).load()).toBeNull()
    fs.writeFileSync(file, Buffer.from('enc:'))
    expect(createTokenStore(file, safe()).load()).toBeNull()
    fs.writeFileSync(file, Buffer.from('enc:{"v":2}'))
    expect(createTokenStore(file, safe()).load()).toBeNull()
    fs.writeFileSync(file, Buffer.from('enc:x'))
    expect(createTokenStore(file, safe(false)).load()).toBeNull()
  })
  it('refuses to save without secure storage and clears the file', () => {
    const file = tmp()
    expect(() => createTokenStore(file, safe(false)).save({ refresh: 'r', scope: '' })).toThrow('Secure storage is not available')
    const store = createTokenStore(file, safe())
    store.save({ refresh: 'r', scope: '' })
    store.clear()
    expect(fs.existsSync(file)).toBe(false)
  })
})
