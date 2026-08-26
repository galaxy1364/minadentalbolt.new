import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initGlobalErrorLogging } from './lib/errorLog'
import { initMaterialSystem } from './lib/materials'

initGlobalErrorLogging()

// MOD-UI-001 — apply the saved (or accessibility-forced) glass level to
// the root element BEFORE first paint, so surfaces never render at the
// default transparency and then visibly snap to the user's setting.
initMaterialSystem()

// Auto-recover from stale-chunk errors: when a background deploy has
// gone out (this app deploys often), a tab that's been open since
// before that deploy can fail to lazy-load a page whose JS filename
// hash no longer exists on the server — "Failed to fetch dynamically
// imported module". Instead of leaving the user stuck on a broken
// page, detect this specific error and reload once, which fetches the
// current index.html and current chunk hashes. Guarded with a
// sessionStorage flag so a genuinely broken/offline network doesn't
// cause an infinite reload loop.
function isStaleChunkError(message: string | undefined): boolean {
  if (!message) return false
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(message)
}

function recoverFromStaleChunk() {
  const key = 'minadent-stale-chunk-reload'
  if (sessionStorage.getItem(key)) return // already tried once this session — avoid a reload loop
  sessionStorage.setItem(key, '1')
  window.location.reload()
}

window.addEventListener('vite:preloadError', () => recoverFromStaleChunk())
window.addEventListener('unhandledrejection', (event) => {
  if (isStaleChunkError(event.reason?.message)) recoverFromStaleChunk()
})
window.addEventListener('error', (event) => {
  if (isStaleChunkError(event.message)) recoverFromStaleChunk()
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// The app rendered without a stale-chunk error — reset the guard so a
// stale-chunk error occurring again later (e.g. after another deploy
// during a long session) can still trigger one more auto-reload.
setTimeout(() => sessionStorage.removeItem('minadent-stale-chunk-reload'), 5000)
