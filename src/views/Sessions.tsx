import { useState } from 'react'
import { removeSession } from '../../shared/sessions.ts'
import type { Session } from '../../shared/types.ts'
import type { Update } from '../App.tsx'
import { fmtDate } from '../lookup.ts'
import { type ConfirmRequest, ConfirmDialog } from './ConfirmDialog.tsx'

interface Props {
  sessions: Session[]
  update: Update
  planName: (id: string) => string
  exerciseName: (id: string) => string
  /** How the session's seconds read, e.g. "40:20" or "hold 30 s". */
  level: (s: Session) => string
}

const SHOWN = 10

/** The latest sessions, newest first, each with what was performed. */
export function SessionList({ sessions, update, planName, exerciseName, level }: Props) {
  const [all, setAll] = useState(false)
  const [ask, setAsk] = useState<ConfirmRequest | null>(null)
  if (!sessions.length) return null
  const sorted = sessions.map((s, i) => ({ s, i })).sort((a, b) => b.s.date.localeCompare(a.s.date) || b.i - a.i)
  const shown = all ? sorted : sorted.slice(0, SHOWN)
  const remove = (s: Session) =>
    setAsk({
      title: `Delete ${planName(s.plan)} of ${fmtDate(s.date)}?`,
      message: 'This session is removed for good.',
      action: 'Delete',
      tone: 'danger',
      onConfirm: () => update((u) => removeSession(u, s.id)),
    })
  return (
    <section className="card">
      <h2>Recent</h2>
      <ul className="sessions">
        {shown.map(({ s }) => (
          <li key={s.id}>
            <div className="session-head">
              <strong>{planName(s.plan)}</strong>
              <span className="muted">
                {fmtDate(s.date)} · {level(s)}
              </span>
              <button className="link danger" onClick={() => remove(s)}>
                Delete
              </button>
            </div>
            <div className="muted small">
              {s.exercises.map((e) => (e.reps === null ? exerciseName(e.id) : `${exerciseName(e.id)} ${e.reps}`)).join(' · ') ||
                'Nothing performed'}
            </div>
          </li>
        ))}
      </ul>
      {sorted.length > SHOWN && (
        <button className="link" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${sorted.length}`}
        </button>
      )}
      <ConfirmDialog request={ask} onClose={() => setAsk(null)} />
    </section>
  )
}
