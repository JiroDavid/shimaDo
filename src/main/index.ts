import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 340, height: 480, webPreferences: { preload: join(__dirname, '../preload/index.js') } })
  const url = process.env['ELECTRON_RENDERER_URL']
  if (url) win.loadURL(url)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
})
