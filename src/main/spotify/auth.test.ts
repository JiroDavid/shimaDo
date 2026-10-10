import { describe, it, expect } from 'vitest'
import http from 'node:http'
import { AuthLostError } from './api'
import { SpotifyAuth, type TokenStore } from './auth'

const CLIENT = 'a'.repeat(32)

function memoryStore(initial: string | null = null): TokenStore & { value: string | null } {
  const s = {
    value: initial,
    load: () => s.value,
    save: (t: string) => {
      s.value = t
    },
    clear: () => {
      s.value = null
    }
  }
  return s
}

const tokenResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status })

function hit(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      res.resume()
      res.on('end', () => resolve(res.statusCode ?? 0))
    }).on('error', reject)
  })
}

function setup(over: { store?: ReturnType<typeof memoryStore>; fetchFn?: typeof fetch; port?: number; timeoutMs?: number; clientId?: string } = {}) {
  const store = over.store ?? memoryStore()
  const bodies: URLSearchParams[] = []
  const fetchFn =
    over.fetchFn ??
    ((async (_url: string, init?: RequestInit) => {
      bodies.push(new URLSearchParams(String(init?.body)))
      return tokenResponse({ access_token: 'acc-1', expires_in: 3600, refresh_token: 'ref-1' })
    }) as unknown as typeof fetch)
  let opened: URL | null = null
  let onOpen: (u: URL) => void = () => {}
  const auth = new SpotifyAuth({
    clientId: () => over.clientId ?? CLIENT,
    store,
    fetchFn,
    port: over.port ?? 0,
    timeoutMs: over.timeoutMs,
    openUrl: (u) => {
      opened = new URL(u)
      onOpen(opened)
    }
  })
  return { auth, store, bodies, opened: () => opened, onOpen: (cb: (u: URL) => void) => (onOpen = cb) }
}

describe('SpotifyAuth.connect', () => {
  it('opens the authorize url, exchanges the code and stores the refresh token', async () => {
    const t = setup()
    t.onOpen((u) => {
      const redirect = u.searchParams.get('redirect_uri')!
      void hit(`${redirect}?code=thecode&state=${u.searchParams.get('state')}`)
    })
    await t.auth.connect()
    const u = t.opened()!
    expect(u.origin + u.pathname).toBe('https://accounts.spotify.com/authorize')
    expect(u.searchParams.get('client_id')).toBe(CLIENT)
    expect(u.searchParams.get('response_type')).toBe('code')
    expect(u.searchParams.get('code_challenge_method')).toBe('S256')
    expect(u.searchParams.get('scope')).toBe('user-read-currently-playing user-read-playback-state user-read-recently-played')
    expect(u.searchParams.get('redirect_uri')).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/callback$/)
    expect(t.bodies[0].get('grant_type')).toBe('authorization_code')
    expect(t.bodies[0].get('code')).toBe('thecode')
    expect(t.bodies[0].get('client_id')).toBe(CLIENT)
    expect(t.bodies[0].get('code_verifier')).toMatch(/^[A-Za-z0-9_-]{43,128}$/)
    expect(t.store.value).toBe('ref-1')
    expect(t.auth.connected).toBe(true)
    expect(await t.auth.accessToken()).toBe('acc-1')
  })

  it('rejects when the user denies access', async () => {
    const t = setup()
    t.onOpen((u) => void hit(`${u.searchParams.get('redirect_uri')}?error=access_denied&state=${u.searchParams.get('state')}`))
    await expect(t.auth.connect()).rejects.toThrow('Spotify authorization was denied')
    expect(t.store.value).toBeNull()
  })

  it('rejects a callback with the wrong state and does not exchange a code', async () => {
    const t = setup({ timeoutMs: 200 })
    let status = 0
    t.onOpen((u) => void hit(`${u.searchParams.get('redirect_uri')}?code=x&state=forged`).then((s) => (status = s)))
    await expect(t.auth.connect()).rejects.toThrow()
    expect(status).toBe(400)
    expect(t.bodies).toHaveLength(0)
  })

  it('times out when nobody completes the login', async () => {
    const t = setup({ timeoutMs: 50 })
    await expect(t.auth.connect()).rejects.toThrow('Timed out waiting for Spotify')
  })

  it('reports a busy port', async () => {
    const blocker = http.createServer()
    await new Promise<void>((r) => blocker.listen(0, '127.0.0.1', r))
    const port = (blocker.address() as { port: number }).port
    const t = setup({ port })
    await expect(t.auth.connect()).rejects.toThrow(`Port ${port} is already in use`)
    blocker.close()
  })

  it('refuses to start without a valid client id', async () => {
    const t = setup({ clientId: 'nope' })
    await expect(t.auth.connect()).rejects.toThrow('Add your Spotify client ID first')
  })
})

describe('SpotifyAuth tokens', () => {
  it('reuses a fresh access token and refreshes an expired one', async () => {
    let n = 0
    const fetchFn = (async () => tokenResponse({ access_token: `acc-${++n}`, expires_in: 3600 })) as unknown as typeof fetch
    const t = setup({ store: memoryStore('ref-0'), fetchFn })
    expect(await t.auth.accessToken()).toBe('acc-1')
    expect(await t.auth.accessToken()).toBe('acc-1')
    expect(await t.auth.refresh()).toBe('acc-2')
  })

  it('keeps a rotated refresh token', async () => {
    const fetchFn = (async () => tokenResponse({ access_token: 'a', expires_in: 3600, refresh_token: 'ref-new' })) as unknown as typeof fetch
    const t = setup({ store: memoryStore('ref-old'), fetchFn })
    await t.auth.refresh()
    expect(t.store.value).toBe('ref-new')
  })

  it('clears the stored token and throws AuthLostError when the refresh is rejected', async () => {
    const fetchFn = (async () => tokenResponse({ error: 'invalid_grant' }, 400)) as unknown as typeof fetch
    const t = setup({ store: memoryStore('ref-old'), fetchFn })
    await expect(t.auth.refresh()).rejects.toBeInstanceOf(AuthLostError)
    expect(t.store.value).toBeNull()
    expect(t.auth.connected).toBe(false)
  })

  it('does not drop the token on a transient server error', async () => {
    const fetchFn = (async () => tokenResponse({}, 503)) as unknown as typeof fetch
    const t = setup({ store: memoryStore('ref-old'), fetchFn })
    await expect(t.auth.refresh()).rejects.not.toBeInstanceOf(AuthLostError)
    expect(t.store.value).toBe('ref-old')
  })

  it('has no access when disconnected', async () => {
    const t = setup()
    await expect(t.auth.accessToken()).rejects.toBeInstanceOf(AuthLostError)
    const t2 = setup({ store: memoryStore('ref') })
    t2.auth.disconnect()
    expect(t2.store.value).toBeNull()
  })
})
