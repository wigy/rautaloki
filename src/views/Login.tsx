import { useState } from 'react'
import type { Me } from '../../shared/types.ts'
import { login } from '../api.ts'

export function Login({ onLogin }: { onLogin: (me: Me) => void }) {
  const [name, setName] = useState('')
  const [unknown, setUnknown] = useState<string>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const submit = async (create: boolean) => {
    setBusy(true)
    setError(undefined)
    try {
      const me = await login(name, create)
      if (me) onLogin(me)
      else setUnknown(name.trim())
    } catch (e) {
      setError(String(e))
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
          if (name.trim()) submit(false)
        }}
      >
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
        <button className="primary" disabled={busy || !name.trim()}>
          Log in
        </button>
        {unknown && (
          <div className="notice">
            <p>No user named “{unknown}”.</p>
            <button type="button" disabled={busy} onClick={() => submit(true)}>
              Create user {unknown}
            </button>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  )
}
