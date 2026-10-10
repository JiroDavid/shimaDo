import fs from 'node:fs'
import type { StoredLogin, TokenStore } from './auth'

interface Safe {
  isEncryptionAvailable(): boolean
  encryptString(s: string): Buffer
  decryptString(b: Buffer): string
}

function parse(plain: string): StoredLogin | null {
  if (!plain) return null
  if (!plain.startsWith('{')) return { refresh: plain, scope: '' }
  try {
    const j = JSON.parse(plain) as { v?: unknown; refresh?: unknown; scope?: unknown }
    if (j.v !== 2 || typeof j.refresh !== 'string' || j.refresh === '') return null
    return { refresh: j.refresh, scope: typeof j.scope === 'string' ? j.scope : '' }
  } catch {
    return null
  }
}

export function createTokenStore(file: string, safe: Safe): TokenStore {
  return {
    load() {
      try {
        if (!safe.isEncryptionAvailable() || !fs.existsSync(file)) return null
        return parse(safe.decryptString(fs.readFileSync(file)))
      } catch {
        return null
      }
    },
    save(login) {
      if (!safe.isEncryptionAvailable()) throw new Error('Secure storage is not available on this system')
      fs.writeFileSync(file, safe.encryptString(JSON.stringify({ v: 2, refresh: login.refresh, scope: login.scope })))
    },
    clear() {
      fs.rmSync(file, { force: true })
    }
  }
}
