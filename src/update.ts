// Moving an open app to a new version. Build files are named by their hash and the page
// itself is never cached, so a reload always gets the current version; but an app left
// open (on Android it lives on in the background) keeps running the code it started with.
// So when the app comes back to the screen, and every so often while it is shown, ask the
// server which script the page loads now, and reload if it is not this one, at a moment
// when nothing is lost: no timer open, nothing saving, no field being typed in.

const EVERY_MS = 10 * 60_000

const SCRIPT = /src="(\/assets\/index-[^"]+\.js)"/
// A reload is tried once per version, so a page that somehow stays different never loops.
const TRIED = 'rautaloki.update-tried'

/** The hashed bundle this page was loaded with, e.g. /assets/index-DOFJ6WyR.js. */
function running(): string | null {
  return SCRIPT.exec(document.documentElement.outerHTML)?.[1] ?? null
}

async function latest(): Promise<string | null> {
  try {
    const res = await fetch('/', { cache: 'no-store' })
    if (!res.ok) return null
    return SCRIPT.exec(await res.text())?.[1] ?? null
  } catch {
    return null // offline: keep going on what we have
  }
}

function safeToReload(): boolean {
  if (document.querySelector('.timer, .saving.on, dialog[open]')) return false
  const field = document.activeElement
  return !(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)
}

let pending: string | null = null

async function check() {
  if (document.visibilityState !== 'visible') return
  if (!pending) {
    const now = await latest()
    const mine = running()
    if (now && mine && now !== mine && sessionStorage.getItem(TRIED) !== now) pending = now
  }
  if (pending && safeToReload()) {
    sessionStorage.setItem(TRIED, pending)
    location.reload()
  }
}

export function watchForUpdates() {
  document.addEventListener('visibilitychange', check)
  setInterval(check, EVERY_MS)
  // A new version found while a timer ran is taken as soon as the timer closes.
  setInterval(() => pending && check(), 5_000)
}
