import { useCallback, useEffect, useRef, useState } from 'react'
import type { Me, Reference, User } from '../shared/types.ts'
import { getMe, getReference, getUser, LoggedOutError, logout, putUser, StaleError } from './api.ts'
import { Account } from './views/Account.tsx'
import { BodyWeight } from './views/BodyWeight.tsx'
import { History } from './views/History.tsx'
import { Login } from './views/Login.tsx'
import { NewCycle } from './views/NewCycle.tsx'
import { Records } from './views/Records.tsx'
import { Stopwatch } from './views/Stopwatch.tsx'
import { Stretching } from './views/Stretching.tsx'
import { Training } from './views/Training.tsx'

export type View = 'training' | 'new' | 'bodyweight' | 'stretch' | 'records' | 'history' | 'account'
export type Update = (change: (user: User) => User) => void

// New cycle is reached from the Lifts tab, and counts as part of it.
const TABS: [View, string][] = [
  ['training', 'Lifts'],
  ['bodyweight', 'Body'],
  ['stretch', 'Stretch'],
  ['records', 'Records'],
  ['history', 'History'],
]

export interface Ctx {
  data: Reference
  user: User
  update: Update
  go: (view: View, exercise?: string) => void
}

/** Errors as shown, with a plain message when the phone has no connection. */
function describe(e: unknown): string {
  return navigator.onLine ? String(e) : 'No connection. Rautaloki needs the internet, try again when online.'
}

export function App() {
  const [me, setMe] = useState<Me | null>()
  const [ref, setRef] = useState<Reference>()
  const [user, setUser] = useState<User>()
  const [view, setView] = useState<View>('training')
  const [exercise, setExercise] = useState<string>()
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [stopwatch, setStopwatch] = useState(false)
  const version = useRef('')
  const queue = useRef(Promise.resolve())

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch((e) => setError(describe(e)))
  }, [])

  const load = useCallback(async (id: string) => {
    const { user, version: v } = await getUser(id)
    version.current = v
    setUser(user)
  }, [])

  // A lost session (cookie cleared, user removed) drops back to the login screen.
  const fail = useCallback((e: unknown) => {
    if (e instanceof LoggedOutError) setMe(null)
    else setError(describe(e))
  }, [])

  useEffect(() => {
    if (!me) return
    setUser(undefined)
    setView('training')
    getReference().then(setRef).catch(fail)
    load(me.id).catch(fail)
  }, [me, load, fail])

  // Changes apply on screen at once and are saved one at a time behind it.
  const current = useRef<User>(undefined)
  current.current = user
  const update: Update = useCallback(
    (change) => {
      const prev = current.current
      if (!prev) return
      const next = change(prev)
      current.current = next
      setUser(next)
      queue.current = queue.current.then(async () => {
        setSaving(true)
        try {
          version.current = await putUser(next, version.current)
          setError(undefined)
        } catch (e) {
          if (e instanceof LoggedOutError) return setMe(null)
          setError(e instanceof StaleError ? `${e.message} Reloaded, check your last entry.` : `Save failed: ${e}`)
          await load(next.id).catch(() => {})
        } finally {
          setSaving(false)
        }
      })
    },
    [load],
  )

  const go = (v: View, ex?: string) => {
    setView(v)
    if (ex) setExercise(ex)
    window.scrollTo(0, 0)
  }

  if (me === undefined) return <main className="loading">{error ?? 'Loading…'}</main>
  if (me === null) return <Login />
  if (!ref) return <main className="loading">{error ?? 'Loading…'}</main>

  const signOut = async () => {
    await queue.current
    await logout().catch(() => {})
    setUser(undefined)
    setMe(null)
  }

  return (
    <>
      <header>
        <img className="logo" src="/favicon.png" alt="" />
        <h1>Rautaloki</h1>
        <button className={`who link ${view === 'account' ? 'active' : ''}`} onClick={() => go('account')} title="Account">
          {me.name}
        </button>
        <span className={`saving ${saving ? 'on' : ''}`} aria-live="polite">
          {saving ? 'Saving…' : ''}
        </span>
        <button className="stopwatch-open" onClick={() => setStopwatch(true)} aria-label="Stopwatch" title="Stopwatch">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="12" cy="14" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 14V9.5M9.5 2.5h5M12 2.5V6M18.5 6.5l1.5-1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <button className="link" onClick={signOut}>
          Log out
        </button>
      </header>
      <nav>
        {TABS.map(([v, label]) => (
          <button
            key={v}
            className={view === v || (v === 'training' && view === 'new') ? 'active' : ''}
            onClick={() => go(v)}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <div className="error" role="alert" onClick={() => setError(undefined)}>
          {error}
        </div>
      )}
      <main>
        {!user ? (
          <p className="muted">Loading…</p>
        ) : view === 'training' ? (
          <Training data={ref} user={user} update={update} go={go} />
        ) : view === 'new' ? (
          <NewCycle data={ref} user={user} update={update} go={go} />
        ) : view === 'bodyweight' ? (
          <BodyWeight data={ref} user={user} update={update} go={go} />
        ) : view === 'stretch' ? (
          <Stretching data={ref} user={user} update={update} go={go} />
        ) : view === 'account' ? (
          <Account
            user={user}
            onSignOut={signOut}
            onDeleted={() => {
              setUser(undefined)
              setMe(null)
            }}
          />
        ) : view === 'records' ? (
          <Records data={ref} user={user} update={update} go={go} />
        ) : (
          <History data={ref} user={user} update={update} go={go} exercise={exercise} setExercise={setExercise} />
        )}
      </main>
      {stopwatch && <Stopwatch onClose={() => setStopwatch(false)} />}
    </>
  )
}
