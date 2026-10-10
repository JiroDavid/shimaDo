import { describe, it, expect } from 'vitest'
import { SPOTIFY_DASHBOARD_URL, SPOTIFY_REDIRECT_URI, SPOTIFY_STYLES, parseControlAction } from './spotify'

describe('spotify setup constants', () => {
  it('uses the loopback redirect the guide tells people to register', () => {
    expect(SPOTIFY_REDIRECT_URI).toBe('http://127.0.0.1:53682/callback')
  })
  it('opens only the official developer dashboard', () => {
    expect(SPOTIFY_DASHBOARD_URL).toBe('https://developer.spotify.com/dashboard')
  })
})

describe('parseControlAction', () => {
  it('accepts the simple actions', () => {
    for (const type of ['play', 'pause', 'next', 'previous']) expect(parseControlAction({ type })).toEqual({ type })
  })
  it('accepts seek and volume with finite numbers only', () => {
    expect(parseControlAction({ type: 'seek', positionMs: 1500 })).toEqual({ type: 'seek', positionMs: 1500 })
    expect(parseControlAction({ type: 'volume', percent: 30 })).toEqual({ type: 'volume', percent: 30 })
    expect(parseControlAction({ type: 'seek', positionMs: NaN })).toBeNull()
    expect(parseControlAction({ type: 'volume', percent: '30' })).toBeNull()
    expect(parseControlAction({ type: 'volume', percent: Infinity })).toBeNull()
  })
  it('rejects unknown or malformed input', () => {
    for (const bad of [null, undefined, 5, 'play', {}, { type: 'shuffle' }, { type: 7 }]) expect(parseControlAction(bad)).toBeNull()
  })
  it('lists the three styles', () => {
    expect(SPOTIFY_STYLES).toEqual(['classic', 'compact', 'visualizer'])
  })
})
