import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, MemoryRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'

// Installed on the home screen, the app keeps its navigation in memory instead of the
// browser history. iOS' edge swipe ("swipe from the left to go back") walks the browser
// history, so with no history entries the gesture simply does nothing.
const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
const startPath = window.location.hash.replace(/^#/, '') || '/'
const Router = standalone ? MemoryRouter : HashRouter
const routerProps = standalone ? { initialEntries: [startPath] } : {}

// No pinch zoom (iOS ignores user-scalable=no in some cases, so block the gesture too).
for (const type of ['gesturestart', 'gesturechange']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false })
}
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1 && !e.target.closest?.('[data-allow-pinch]')) e.preventDefault()
  },
  { passive: false },
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router {...routerProps}>
      <App />
    </Router>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'))
}
