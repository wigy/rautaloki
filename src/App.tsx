import { useCallback, useEffect, useRef, useState } from 'react'
import type { Reference, User } from '../shared/types.ts'
import { getReference, getUser, putUser, StaleError } from './api.ts'
import { History } from './views/History.tsx'
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
  const [ref, setRef] = useState<Reference>()
  const [userId, setUserId] = useState(() => localStorage.getItem('rautaloki.user') ?? '')
  const [user, setUser] = useState<User>()
  const [view, setView] = useState<View>('training')
  const [exercise, setExercise] = useState<string>()
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const version = useRef('')
  const queue = useRef(Promise.resolve())

  useEffect(() => {
    getReference()
      .then((r) => {
        setRef(r)
        if (!r.users.some((u) => u.id === userId)) setUserId(r.users[0]?.id ?? '')
      })
      .catch((e) => setError(String(e)))
  }, [])

  const load = useCallback(async (id: string) => {
    const { user, version: v } = await getUser(id)
    version.current = v
    setUser(user)
  }, [])

  useEffect(() => {
    if (!userId) return
    localStorage.setItem('rautaloki.user', userId)
    setUser(undefined)
    load(userId).catch((e) => setError(String(e)))
  }, [userId, load])

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

  if (!ref) return <main className="loading">{error ?? 'Loading…'}</main>

  return (
    <>
      <header>
        <h1>Rautaloki</h1>
        <select value={userId} onChange={(e) => setUserId(e.target.value)} aria-label="User">
          {ref.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <span className={`saving ${saving ? 'on' : ''}`} aria-live="polite">
          {saving ? 'Saving…' : ''}
        </span>
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
