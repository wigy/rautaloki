import { useEffect, useRef, useState } from 'react'
import { getGoogleClientId } from '../api.ts'
import hero from '../assets/login.webp'

const GSI = 'https://accounts.google.com/gsi/client'

interface GoogleId {
  initialize(options: { client_id: string; ux_mode: 'redirect'; login_uri: string }): void
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

function loadGsi(): Promise<GoogleId> {
  if (window.google) return Promise.resolve(window.google.accounts.id)
  return new Promise((ok, fail) => {
    const script = document.createElement('script')
    script.src = GSI
    script.async = true
    script.onload = () => (window.google ? ok(window.google.accounts.id) : fail(new Error('Google sign-in did not load')))
    script.onerror = () => fail(new Error('Google sign-in could not be loaded. Are you online?'))
    document.head.append(script)
  })
}

/**
 * Sign in with Google in redirect mode: Google posts the chosen account to the server,
 * which sets the session cookie and sends the browser back here. That works the same in
 * a browser, an installed app and the Android app, with no popup.
 */
export function Login() {
  const button = useRef<HTMLDivElement>(null)
  // The server sends a failed login back as ?login=<reason>; show it once and drop it.
  const [error, setError] = useState(() => new URLSearchParams(location.search).get('login') ?? undefined)

  useEffect(() => {
    if (location.search) history.replaceState(null, '', location.pathname)
    let gone = false
    getGoogleClientId()
      .then(async (clientId) => {
        if (!clientId) throw new Error('Google sign-in is not configured on the server.')
        const id = await loadGsi()
        if (gone || !button.current) return
        id.initialize({ client_id: clientId, ux_mode: 'redirect', login_uri: `${location.origin}/api/login/google` })
        const dark = matchMedia('(prefers-color-scheme: dark)').matches
        id.renderButton(button.current, { theme: dark ? 'filled_black' : 'outline', size: 'large', text: 'signin_with', shape: 'pill', width: 260 })
      })
      .catch((e) => gone || setError(e instanceof Error ? e.message : String(e)))
    return () => {
      gone = true
    }
  }, [])

  return (
    <main>
      <div className="card login">
        <img className="banner hero" src={hero} alt="" />
        <h1>Rautaloki</h1>
        <div className="google" ref={button} />
        <p className="muted small">A new Google account gets a new, empty training log.</p>
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  )
}
