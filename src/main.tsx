import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/outfit'
import './lib/theme'
import App from './App'
import './styles.css'

// iOS hervat de app vaak uit het geheugen zonder nieuwe check; daarom ook bij terugkomen naar de app.
registerSW({
  immediate: true,
  onRegisteredSW: (_url, reg) => document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg?.update()),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
