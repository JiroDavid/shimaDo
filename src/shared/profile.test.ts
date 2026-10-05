import { describe, it, expect } from 'vitest'
import { centerSquare, emptyProfile, validateProfile } from './profile'
import type { ProfileInput } from './types'

const TODAY = '2026-10-05'
const ok: ProfileInput = { username: 'jiro', firstName: 'Jiro', dateOfBirth: '2000-01-31', heightCm: 180 }

describe('validateProfile', () => {
  it('accepts a full profile and an empty one', () => {
    expect(validateProfile(ok, TODAY)).toBeNull()
    const { avatarUpdatedAt, ...blank } = emptyProfile()
    expect(avatarUpdatedAt).toBeNull()
    expect(validateProfile(blank, TODAY)).toBeNull()
  })
  it('rejects overlong names', () => {
    expect(validateProfile({ ...ok, username: 'a'.repeat(33) }, TODAY)).toMatch(/username/i)
    expect(validateProfile({ ...ok, firstName: 'a'.repeat(65) }, TODAY)).toMatch(/first name/i)
  })
  it('rejects impossible, ancient or future birth dates', () => {
    expect(validateProfile({ ...ok, dateOfBirth: '2026-02-30' }, TODAY)).toMatch(/birth/i)
    expect(validateProfile({ ...ok, dateOfBirth: '1850-01-01' }, TODAY)).toMatch(/birth/i)
    expect(validateProfile({ ...ok, dateOfBirth: '2999-01-01' }, TODAY)).toMatch(/birth/i)
  })
  it('rejects out-of-range or non-finite height', () => {
    expect(validateProfile({ ...ok, heightCm: 10 }, TODAY)).toMatch(/height/i)
    expect(validateProfile({ ...ok, heightCm: NaN }, TODAY)).toMatch(/height/i)
  })
})

describe('centerSquare', () => {
  it('crops the centre of a wide or tall image', () => {
    expect(centerSquare(200, 100)).toEqual({ x: 50, y: 0, size: 100 })
    expect(centerSquare(100, 200)).toEqual({ x: 0, y: 50, size: 100 })
    expect(centerSquare(64, 64)).toEqual({ x: 0, y: 0, size: 64 })
  })
})
