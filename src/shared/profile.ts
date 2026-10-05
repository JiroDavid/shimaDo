import { isValidDateKey } from './dates'
import type { Profile, ProfileInput } from './types'

export const emptyProfile = (): Profile => ({
  username: '',
  firstName: '',
  dateOfBirth: '',
  heightCm: null,
  avatarUpdatedAt: null
})

export function validateProfile(p: ProfileInput, todayKey: string): string | null {
  if (p.username.trim().length > 32) return 'Username is too long'
  if (p.firstName.trim().length > 64) return 'First name is too long'
  if (p.dateOfBirth !== '' && !(isValidDateKey(p.dateOfBirth) && p.dateOfBirth >= '1900-01-01' && p.dateOfBirth <= todayKey)) {
    return 'Date of birth is not valid'
  }
  if (p.heightCm !== null && !(Number.isFinite(p.heightCm) && p.heightCm >= 50 && p.heightCm <= 272)) return 'Height must be 50-272 cm'
  return null
}

export function centerSquare(width: number, height: number): { x: number; y: number; size: number } {
  const size = Math.min(width, height)
  return { x: Math.floor((width - size) / 2), y: Math.floor((height - size) / 2), size }
}
