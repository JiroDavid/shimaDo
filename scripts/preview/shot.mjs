import { spawn } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.svg': 'image/svg+xml' }
const PANEL_IDS = ['bar', 'checklist', 'schedule', 'gym', 'progress', 'habits', 'focus', 'notepad', 'settings', 'profile', 'confirm', 'mini', 'welcome', 'designer']

const FIXTURE_ASSETS = ['fixture-png-one', 'fixture-png-two']

const CLICK = (label) => `await w(1200); q(${JSON.stringify(label)}).click(); await w(600)`

export const SHOTS = [
  { name: 'bar', hash: 'bar', size: '700x80' },
  { name: 'checklist', hash: 'checklist', size: '380x600' },
  { name: 'schedule-list', hash: 'schedule', size: '420x760' },
  { name: 'schedule-week', hash: 'schedule', size: '780x760', steps: CLICK('Week') },
  { name: 'schedule-day', hash: 'schedule', size: '420x860', steps: CLICK('Today') },
  { name: 'habits', hash: 'habits', size: '340x560' },
  { name: 'progress', hash: 'progress', size: '340x520' },
  { name: 'focus', hash: 'focus', size: '320x640' },
  { name: 'notepad', hash: 'notepad', size: '340x420' },
  { name: 'settings', hash: 'settings', size: '400x860' },
  { name: 'gym', hash: 'gym', size: '380x640' },
  { name: 'profile', hash: 'profile', size: '360x520' },
  {
    name: 'designer',
    hash: 'designer',
    size: '340x760',
    edit: { active: true, selected: { id: 'checklist.heading', panel: 'checklist', computed: { color: 'rgb(243, 233, 214)', background: 'rgba(0, 0, 0, 0)', borderColor: 'rgb(243, 233, 214)', radius: 0, borderWidth: 0, fontSize: 32, bold: true } }, canUndo: true, canRedo: false },
    design: { overrides: { 'checklist.heading': { color: '#ff3366', fontSize: 30 } } }
  },
  { name: 'placed', hash: 'checklist', size: '380x600', design: { overrides: {}, moves: {}, backgrounds: { 'checklist.panel': { asset: 'fixture-png-two', fit: 'cover', opacity: 0.35 } }, stickers: [{ id: 'stk-one-0001', panel: 'checklist', kind: 'emoji', emoji: '🔥', x: 250, y: 60, size: 56, layer: 'front' }, { id: 'stk-two-0002', panel: 'checklist', kind: 'image', asset: 'fixture-png-one', x: 20, y: 380, size: 72, layer: 'behind' }] } },
  { name: 'placed-bar', hash: 'bar', size: '740x90', design: { overrides: {}, moves: {}, backgrounds: { 'bar.surface': { asset: 'fixture-png-one', fit: 'tile', opacity: 0.3 } }, stickers: [{ id: 'stk-bar-0003', panel: 'bar', kind: 'emoji', emoji: '⭐', x: 330, y: 8, size: 40, layer: 'front' }] } },
  { name: 'welcome', hash: 'welcome', size: '520x640' }
]

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const base = join(homedir(), '.cache', 'ms-playwright')
  const dir = existsSync(base) ? readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().pop() : undefined
  if (!dir) throw new Error('Set CHROME_PATH to a Chrome or Chromium binary')
  return join(base, dir, 'chrome-linux64', 'chrome')
}

const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function fixture(options) {
  const data = JSON.parse(readFileSync(join(ROOT, 'scripts/preview/fixture.json'), 'utf8'))
  const today = new Date()
  data.completions = [{ taskId: 'lunch', occurrenceDate: key(today), doneAt: today.toISOString() }]
  data.habitLog = { h1: {}, h2: {} }
  for (let i = 0; i < 12; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (i % 3 !== 2) data.habitLog.h1[key(d)] = true
    if (i % 2 === 0) data.habitLog.h2[key(d)] = true
  }
  const panels = {}
  for (const id of PANEL_IDS) panels[id] = { width: 400, height: 500, visible: id === 'bar' }
  Object.assign(data.settings, {
    panels,
    theme: options.theme ?? 'classic',
    accent: options.accent ?? 'orange',
    opacity: options.opacity ?? 0.9,
    onboarded: true
  })
  data.design = options.design ?? { overrides: {}, moves: {}, stickers: [], backgrounds: {} }
  data.assets = Object.fromEntries(FIXTURE_ASSETS.map((id) => [id, { id, ext: 'png', bytes: 100, name: `${id}.png`, addedAt: 1 }]))
  return data
}

function page(root, options) {
  const data = fixture(options)
  const timer = { phase: 'focus', running: false, endsAt: null, remainingMs: 1_500_000, cycle: 0, task: '' }
  const edit = options.edit ?? { active: false, selected: null, canUndo: false, canRedo: false }
  const mock = `<script>window.__ASSET_BASE__ = '/assets/'; window.shima = new Proxy({
    getData: () => Promise.resolve(${JSON.stringify(data)}),
    onChange: () => () => {},
    getTimer: () => Promise.resolve(${JSON.stringify(timer)}),
    onTimer: () => () => {},
    getAvatar: () => Promise.resolve(null),
    listDisplays: () => Promise.resolve([]),
    getEditState: () => Promise.resolve(${JSON.stringify(edit)}),
    onEditState: () => () => {}
  }, { get: (t, k) => (k in t ? t[k] : (...a) => { (window.__calls ||= []).push([String(k), a]); return Promise.resolve() }) })</script>`
  const driver = options.steps
    ? `<script>const q = (t) => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === t || b.textContent.trim() === t); const w = (ms) => new Promise((r) => setTimeout(r, ms)); (async () => { ${options.steps} })()</script>`
    : ''
  let html = readFileSync(join(root, 'index.html'), 'utf8')
  html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '').replace('<head>', `<head>${mock}`).replace('</body>', `${driver}</body>`)
  writeFileSync(join(root, 'index.html'), html)
}

export async function shot(options) {
  const built = join(ROOT, 'out', 'renderer')
  if (!existsSync(join(built, 'index.html'))) throw new Error('Build first: npx electron-vite build')
  const root = mkdtempSync(join(tmpdir(), 'shimado-shot-'))
  cpSync(built, root, { recursive: true })
  page(root, options)
  const server = createServer((req, res) => {
    const asset = /^\/assets\/(fixture-png-[a-z]+)$/.exec((req.url ?? '').split('?')[0])
    if (asset) {
      res.writeHead(200, { 'content-type': 'image/png' }).end(readFileSync(join(ROOT, 'scripts/preview/fixture-assets', `${asset[1]}.png`)))
      return
    }
    const file = join(root, decodeURIComponent((req.url ?? '/').split('?')[0]).replace(/^\/$/, '/index.html'))
    if (!file.startsWith(root) || !existsSync(file)) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file))
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const { port } = server.address()
  const [width, height] = options.size.split('x')
  const args = [
    '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--window-size=${width},${height}`,
    '--virtual-time-budget=6000', `--screenshot=${resolve(options.out)}`, `http://127.0.0.1:${port}/index.html#/${options.hash}`
  ]
  await new Promise((resolveExit, reject) => {
    const child = spawn(findChrome(), args, { stdio: 'ignore' })
    child.on('error', reject)
    child.on('exit', resolveExit)
  })
  server.close()
  rmSync(root, { recursive: true, force: true })
  return resolve(options.out)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`)
    return i === -1 ? fallback : process.argv[i + 1]
  }
  const out = await shot({ hash: arg('panel', 'checklist'), size: arg('size', '420x760'), out: arg('out', 'shot.png'), theme: arg('theme'), accent: arg('accent'), steps: arg('steps'), design: arg('design') ? JSON.parse(arg('design')) : undefined, edit: arg('edit') ? JSON.parse(arg('edit')) : undefined })
  console.log(out)
}
