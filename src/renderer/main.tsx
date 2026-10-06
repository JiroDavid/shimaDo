import { createRoot } from 'react-dom/client'
import '@fontsource/m-plus-rounded-1c/400.css'
import '@fontsource/m-plus-rounded-1c/500.css'
import '@fontsource/m-plus-rounded-1c/700.css'
import '@fontsource/m-plus-rounded-1c/800.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow-condensed/800.css'
import './styles.css'
import { App, currentPanel } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { applyTheme } from './lib/applyTheme'

applyTheme({ theme: 'classic', accent: 'orange', opacity: 0.9 })

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary panel={currentPanel()}>
    <App />
  </ErrorBoundary>
)
