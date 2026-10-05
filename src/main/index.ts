import { app } from 'electron'
import { join } from 'node:path'
import { PANEL_IDS } from '../shared/types'
import { registerIpc } from './ipc'
import { PanelManager } from './panels'
import { Store } from './store'

app.whenReady().then(() => {
  const store = new Store(join(app.getPath('userData'), 'shimado-data.json'))
  store.load()
  const panels = new PanelManager(
    store,
    { preload: join(__dirname, '../preload/index.js'), devUrl: process.env['ELECTRON_RENDERER_URL'], file: join(__dirname, '../renderer/index.html') },
    () => {}
  )
  registerIpc(store, panels, { changeSettings: () => {}, confirmExit: async () => {}, pickAvatar: async () => null, readAvatar: () => null })
  for (const id of PANEL_IDS) if (store.data.settings.panels[id].visible) panels.show(id)
})
