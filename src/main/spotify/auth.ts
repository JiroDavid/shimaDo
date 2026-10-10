import http from 'node:http'
import { CLIENT_ID_PATTERN, SPOTIFY_REDIRECT_PORT, SPOTIFY_SCOPES } from '../../shared/spotify'
import { AuthLostError, type TokenSource } from './api'
import { challengeFor, makeState, makeVerifier } from './pkce'

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const LOGIN_TIMEOUT_MS = 3 * 60 * 1000
const EXPIRY_MARGIN_MS = 60_000

export interface TokenStore {
  load(): string | null
  save(refreshToken: string): void
  clear(): void
}

interface Options {
  clientId: () => string
  store: TokenStore
  openUrl: (url: string) => void
  fetchFn?: typeof fetch
  port?: number
  timeoutMs?: number
}

interface TokenBody {
  access_token?: string
  expires_in?: number
  refresh_token?: string
}

const PAGE = (msg: string) => `<!doctype html><meta charset="utf-8"><title>ShimaDo</title><body style="font-family:sans-serif;padding:2rem"><h2>${msg}</h2><p>You can close this tab and go back to ShimaDo.</p></body>`

export class SpotifyAuth implements TokenSource {
  private access: { token: string; expiresAt: number } | null = null
  private inflight: Promise<string> | null = null

  constructor(private o: Options) {}

  get connected(): boolean {
    return this.o.store.load() !== null
  }

  disconnect(): void {
    this.access = null
    this.o.store.clear()
  }

  async connect(): Promise<void> {
    const clientId = this.o.clientId()
    if (!CLIENT_ID_PATTERN.test(clientId)) throw new Error('Add your Spotify client ID first')
    const verifier = makeVerifier()
    const state = makeState()
    const { code, redirectUri } = await this.awaitCallback(state, (redirect) => {
      const url = new URL(AUTHORIZE_URL)
      url.search = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: SPOTIFY_SCOPES.join(' '),
        redirect_uri: redirect,
        state,
        code_challenge_method: 'S256',
        code_challenge: challengeFor(verifier)
      }).toString()
      this.o.openUrl(url.toString())
    })
    const body = await this.token({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier })
    if (!body.refresh_token) throw new Error('Spotify did not return a refresh token')
    this.o.store.save(body.refresh_token)
  }

  async accessToken(): Promise<string> {
    if (this.access && this.access.expiresAt - Date.now() > EXPIRY_MARGIN_MS) return this.access.token
    return this.refresh()
  }

  refresh(): Promise<string> {
    this.inflight ??= this.doRefresh().finally(() => {
      this.inflight = null
    })
    return this.inflight
  }

  private async doRefresh(): Promise<string> {
    const refreshToken = this.o.store.load()
    if (!refreshToken) throw new AuthLostError()
    const res = await this.post({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: this.o.clientId() })
    if (res.status === 400 || res.status === 401) {
      this.disconnect()
      throw new AuthLostError()
    }
    if (!res.ok) throw new Error(`Spotify token refresh failed (${res.status})`)
    const body = (await res.json()) as TokenBody
    if (!body.access_token) throw new Error('Spotify returned no access token')
    this.access = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 }
    if (body.refresh_token) this.o.store.save(body.refresh_token)
    return body.access_token
  }

  private post(params: Record<string, string>): Promise<Response> {
    return (this.o.fetchFn ?? fetch)(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString()
    })
  }

  private async token(params: Record<string, string>): Promise<TokenBody> {
    const res = await this.post(params)
    if (!res.ok) throw new Error(`Spotify login failed (${res.status})`)
    const body = (await res.json()) as TokenBody
    if (!body.access_token) throw new Error('Spotify returned no access token')
    this.access = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 }
    return body
  }

  private awaitCallback(state: string, onListening: (redirectUri: string) => void): Promise<{ code: string; redirectUri: string }> {
    const port = this.o.port ?? SPOTIFY_REDIRECT_PORT
    return new Promise((resolve, reject) => {
      let settled = false
      let redirect = ''
      const server = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1')
        if (url.pathname !== '/callback') {
          res.writeHead(404).end()
          return
        }
        if (url.searchParams.get('state') !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html' }).end(PAGE('Login could not be verified'))
          return
        }
        const code = url.searchParams.get('code')
        const failed = url.searchParams.get('error') !== null || !code
        res.writeHead(200, { 'Content-Type': 'text/html' }).end(PAGE(failed ? 'Spotify login was cancelled' : 'Connected to Spotify'))
        finish(failed ? new Error('Spotify authorization was denied') : null, code ?? '')
      })
      const timer = setTimeout(() => finish(new Error('Timed out waiting for Spotify'), ''), this.o.timeoutMs ?? LOGIN_TIMEOUT_MS)
      const finish = (err: Error | null, code: string) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        server.close()
        server.closeAllConnections()
        if (err) reject(err)
        else resolve({ code, redirectUri: redirect })
      }
      server.on('error', (e: NodeJS.ErrnoException) => finish(new Error(e.code === 'EADDRINUSE' ? `Port ${port} is already in use` : e.message), ''))
      server.listen(port, '127.0.0.1', () => {
        redirect = `http://127.0.0.1:${(server.address() as { port: number }).port}/callback`
        onListening(redirect)
      })
    })
  }
}
