import { useCallback, useEffect, useRef, useState } from 'react'
import type { Me, Reference, User } from '../shared/types.ts'
import { getMe, getReference, getUser, LoggedOutError, logout, putUser, StaleError } from './api.ts'
import { History } from './views/History.tsx'
import { Login } from './views/Login.tsx'
import { NewCycle } from './views/NewCycle.tsx'
import { Records } from './views/Records.tsx'
import { Training } from './views/Training.tsx'

export type View = 'training' | 'new' | 'records' | 'history'
export type Update = (change: (user: User) => User) => void

const TABS: [View, string][] = [
  ['training', 'Training'],
  ['new', 'New cycle'],
  ['records', 'Records'],
  ['history', 'History'],
]

export interface Ctx {
  data: Reference
  user: User
  update: Update
  go: (view: View, exercise?: string) => void
}

export function App() {
  const [me, setMe] = useState<Me | null>()
  const [ref, setRef] = useState<Reference>()
  const [user, setUser] = useState<User>()
  const [view, setView] = useState<View>('training')
  const [exercise, setExercise] = useState<string>()
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const version = useRef('')
  const queue = useRef(Promise.resolve())

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch((e) => setError(String(e)))
  }, [])

  const load = useCallback(async (id: string) => {
    const { user, version: v } = await getUser(id)
    version.current = v
    setUser(user)
  }, [])

  // A lost session (cookie cleared, user removed) drops back to the login screen.
  const fail = useCallback((e: unknown) => {
    if (e instanceof LoggedOutError) setMe(null)
    else setError(String(e))
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
  if (me === null) return <Login onLogin={setMe} />
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
        <span className="who">{me.name}</span>
        <span className={`saving ${saving ? 'on' : ''}`} aria-live="polite">
          {saving ? 'Saving…' : ''}
        </span>
        <button className="link" onClick={signOut}>
          Log out
        </button>
      </header>
      <nav>
        {TABS.map(([v, label]) => (
          <button key={v} className={view === v ? 'active' : ''} onClick={() => go(v)}>
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
        ) : view === 'records' ? (
          <Records data={ref} user={user} update={update} go={go} />
        ) : (
          <History data={ref} user={user} update={update} go={go} exercise={exercise} setExercise={setExercise} />
        )}
      </main>
    </>
  )
}
