import { describe, it, expect } from 'vitest'
import { challengeFor, makeState, makeVerifier } from './pkce'

describe('pkce', () => {
  it('matches the RFC 7636 test vector', () => {
    expect(challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
  it('makes url-safe verifiers of valid length and unique states', () => {
    const v = makeVerifier()
    expect(v).toMatch(/^[A-Za-z0-9_-]{43,128}$/)
    expect(makeState()).toMatch(/^[A-Za-z0-9_-]{16,}$/)
    expect(makeState()).not.toBe(makeState())
  })
})
