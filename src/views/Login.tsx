import { useState } from 'react'
import type { Me } from '../../shared/types.ts'
import { login } from '../api.ts'
import hero from '../assets/login.webp'

export function Login({ onLogin }: { onLogin: (me: Me) => void }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [unknown, setUnknown] = useState<string>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const submit = async (create: boolean) => {
    setBusy(true)
    setError(undefined)
    try {
      const me = await login(name, password, create)
      if (me) onLogin(me)
      else setUnknown(name.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <form
        className="card login"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim() && password) submit(false)
        }}
      >
        <img className="banner hero" src={hero} alt="" />
        <h1>Rautaloki</h1>
        <label>
          Your name
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setUnknown(undefined)
            }}
            autoComplete="username"
            autoCapitalize="words"
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={unknown ? 'new-password' : 'current-password'}
          />
        </label>
        <button className="primary" disabled={busy || !name.trim() || !password}>
          Log in
        </button>
        {unknown && (
          <div className="notice">
            <p>No user named “{unknown}”. Creating one sets the password above as theirs.</p>
            <button type="button" disabled={busy || password.length < 8} onClick={() => submit(true)}>
              Create user {unknown}
            </button>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  )
}
