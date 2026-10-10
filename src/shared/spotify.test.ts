import { describe, it, expect } from 'vitest'
import { SPOTIFY_DASHBOARD_URL, SPOTIFY_REDIRECT_URI } from './spotify'

describe('spotify setup constants', () => {
  it('uses the loopback redirect the guide tells people to register', () => {
    expect(SPOTIFY_REDIRECT_URI).toBe('http://127.0.0.1:53682/callback')
  })
  it('opens only the official developer dashboard', () => {
    expect(SPOTIFY_DASHBOARD_URL).toBe('https://developer.spotify.com/dashboard')
  })
})
