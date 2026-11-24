import { useState } from 'react'
import type { User } from '../../shared/types.ts'
import { deleteAccount } from '../api.ts'
import { type ConfirmRequest, ConfirmDialog } from './ConfirmDialog.tsx'

interface Props {
  user: User
  onSignOut: () => void
  /** Called once the account is gone; the app returns to the login screen. */
  onDeleted: () => void
}

export function Account({ user, onSignOut, onDeleted }: Props) {
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [ask, setAsk] = useState<ConfirmRequest | null>(null)
  const cycles = user.cycles.length
  const sessions = user.sessions?.length ?? 0

  const remove = () =>
    setAsk({
      title: 'Delete your account?',
      message: `${user.name} and all the training data (${cycles} cycles, ${sessions} sessions) are removed for good. This cannot be undone.`,
      action: 'Delete account',
      tone: 'danger',
      onConfirm: async () => {
        setBusy(true)
        setError(undefined)
        try {
          await deleteAccount(user.id)
          onDeleted()
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e))
          setBusy(false)
        }
      },
    })

  return (
    <>
      <section className="card">
        <h2>{user.name}</h2>
        <p className="muted small">
          {cycles} lifting cycles · {sessions} body weight and stretching sessions
        </p>
        <div className="row">
          <button onClick={onSignOut}>Log out</button>
        </div>
        <p className="small">
          <a href="/privacy.html" target="_blank" rel="noopener">
            Privacy policy
          </a>
        </p>
      </section>
      <section className="card">
        <h2>Delete account</h2>
        <p className="small">Removes your account and all your training data from the server for good.</p>
        <div className="row">
          <button className="danger" disabled={busy} onClick={remove}>
            Delete account
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
      <ConfirmDialog request={ask} onClose={() => setAsk(null)} />
    </>
  )
}
