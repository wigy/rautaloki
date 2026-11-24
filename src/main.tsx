import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import './styles.css'
import { watchForUpdates } from './update.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Installable app and offline start; not in development, where Vite serves the files.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

// An open app moves to a new version by itself, when nothing would be lost.
if (import.meta.env.PROD) watchForUpdates()
