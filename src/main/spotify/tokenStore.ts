import fs from 'node:fs'
import type { TokenStore } from './auth'

interface Safe {
  isEncryptionAvailable(): boolean
  encryptString(s: string): Buffer
  decryptString(b: Buffer): string
}

export function createTokenStore(file: string, safe: Safe): TokenStore {
  return {
    load() {
      try {
        if (!safe.isEncryptionAvailable() || !fs.existsSync(file)) return null
        return safe.decryptString(fs.readFileSync(file)) || null
      } catch {
        return null
      }
    },
    save(token) {
      if (!safe.isEncryptionAvailable()) throw new Error('Secure storage is not available on this system')
      fs.writeFileSync(file, safe.encryptString(token))
    },
    clear() {
      fs.rmSync(file, { force: true })
    }
  }
}
