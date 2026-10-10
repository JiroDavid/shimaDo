import { createHash, randomBytes } from 'node:crypto'

export const makeVerifier = (): string => randomBytes(64).toString('base64url')

export const makeState = (): string => randomBytes(16).toString('base64url')

export const challengeFor = (verifier: string): string => createHash('sha256').update(verifier).digest('base64url')
