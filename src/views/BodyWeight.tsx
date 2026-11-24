import { useMemo, useState } from 'react'
import {
  BW_DAYS,
  BW_GENERAL,
  BW_ROUNDS,
  BW_WORK_MAX,
  BW_WORK_MIN,
  type BwDay,
  bwDay,
  bwExercise,
  bwLevel,
} from '../../shared/bodyweight.ts'
import { bwPlan } from '../../shared/intervals.ts'
import {
  addSession,
  doneThisWeek,
  lastOf,
  lastReps,
  newSession,
  proposedWork,
  sessionsOf,
  stepWork,
} from '../../shared/sessions.ts'
import { today } from '../../shared/training.ts'
import type { Performed, Session } from '../../shared/types.ts'
import type { Ctx } from '../App.tsx'
import { fmtDate } from '../lookup.ts'
import { IntervalTimer } from './IntervalTimer.tsx'
import { SessionList } from './Sessions.tsx'

export function BodyWeight(ctx: Ctx) {
  const sessions = sessionsOf(ctx.user, 'bodyweight')
  const now = today()
  // Days already done this week go below the rest (the sort is stable).
  const days = [...BW_DAYS].sort(
    (a, b) => Number(doneThisWeek(sessions, a.id, now)) - Number(doneThisWeek(sessions, b.id, now)),
  )
  return (
    <>
      <p className="muted intro">
        Interval training without weights, {BW_ROUNDS} rounds of each day's exercises. The level is work:rest seconds
        of each minute.
      </p>
      {days.map((d) => (
        <DayCard key={d.id} ctx={ctx} day={d} sessions={sessions} doneNow={doneThisWeek(sessions, d.id, now)} />
      ))}
      <SessionList
        sessions={sessions}
        update={ctx.update}
        planName={(id) => bwDay(id)?.name ?? id}
        exerciseName={(id) => bwExercise(id).name}
        level={(s) => bwLevel(s.seconds)}
      />
    </>
  )
}

function DayCard({ ctx, day, sessions, doneNow }: { ctx: Ctx; day: BwDay; sessions: Session[]; doneNow: boolean }) {
  const [work, setWork] = useState(() => proposedWork(sessions, day.id))
  const [timing, setTiming] = useState(false)
  const [logging, setLogging] = useState(false)
  const [howTo, setHowTo] = useState(false)
  const plan = useMemo(() => bwPlan(day, work), [day, work])
  const last = lastOf(sessions, day.id)

  const save = (exercises: Performed[]) => {
    ctx.update((u) => addSession(u, newSession(u, 'bodyweight', day.id, today(), work, exercises)))
    setTiming(false)
    setLogging(false)
  }
  const level = (
    <div className="adjust">
      <button onClick={() => setWork(stepWork(work, -1))} disabled={work <= BW_WORK_MIN} aria-label="Easier">
        −
      </button>
      <span>Level {bwLevel(work)}</span>
      <button onClick={() => setWork(stepWork(work, 1))} disabled={work >= BW_WORK_MAX} aria-label="Harder">
        +
      </button>
    </div>
  )

  return (
    <section className={doneNow ? 'card week-done' : 'card'}>
      {doneNow && (
        <span className="week-tick" role="img" aria-label="Done this week" title="Done this week">
          ✓
        </span>
      )}
      <div className="card-title">
        <div className="card-head">
          <h2>{day.name}</h2>
          <span className="muted">{last ? `last ${fmtDate(last.date)} at ${bwLevel(last.seconds)}` : 'not done yet'}</span>
        </div>
      </div>
      <ol className="bw-list">
        {day.exercises.map((id) => {
          const ex = bwExercise(id)
          const prev = ex.hold ? null : lastReps(sessions, id)
          return (
            <li key={id}>
              {ex.name}
              {prev && (
                <span className="muted small">
                  {' '}
                  {prev.reps} at {bwLevel(prev.seconds)}
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <div className="plan">
        {level}
        <button type="button" className="exercise-now" onClick={() => setTiming(true)}>
          <PlayIcon />
          Exercise Now
        </button>
        {timing && (
          <IntervalTimer
            plan={plan}
            title={`Body weight, ${day.name}`}
            subtitle={`${bwLevel(work)} · ${BW_ROUNDS} rounds`}
            labels={{ work: 'Work', rest: 'Rest' }}
            setup={
              <>
                <div className="timer-phase">{bwLevel(work)}</div>
                <p className="muted">
                  {BW_ROUNDS} rounds of {day.exercises.length} exercises, {work} s work and {60 - work} s rest each
                </p>
                {level}
              </>
            }
            finish={(done) => (
              <>
                <div className="timer-phase">Done</div>
                <BwEntry
                  sessions={sessions}
                  exercises={done.map((i) => day.exercises[i])}
                  onSave={save}
                  onCancel={() => setTiming(false)}
                />
              </>
            )}
            onClose={() => setTiming(false)}
          />
        )}
        {logging && (
          <BwEntry sessions={sessions} exercises={day.exercises} onSave={save} onCancel={() => setLogging(false)} />
        )}
      </div>
      <div className="card-actions">
        {!logging && (
          <button className="link" onClick={() => setLogging(true)}>
            Log without timer
          </button>
        )}
        <button className="link" onClick={() => setHowTo(!howTo)}>
          {howTo ? 'Close how to' : 'How to'}
        </button>
      </div>
      {howTo && (
        <div className="settings howto">
          {day.exercises.map((id) => {
            const ex = bwExercise(id)
            return (
              <div key={id}>
                <h3>{ex.name}</h3>
                <ol>
                  {ex.steps.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
                <ul>
                  {ex.watch.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )
          })}
          <h3>Every session</h3>
          <ul>
            {BW_GENERAL.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** Repeats per performed exercise, summed over the rounds; empty is saved as not counted. */
function BwEntry({
  sessions,
  exercises,
  onSave,
  onCancel,
}: {
  sessions: Session[]
  exercises: string[]
  onSave: (performed: Performed[]) => void
  onCancel: () => void
}) {
  const [reps, setReps] = useState<Record<string, string>>({})
  const parsed = exercises.map((id) => {
    const v = (reps[id] ?? '').trim()
    return { id, reps: v === '' ? null : Number(v) }
  })
  const valid = parsed.every((p) => p.reps === null || (Number.isInteger(p.reps) && p.reps >= 0))
  return (
    <form
      className="bw-entry"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave(parsed)
      }}
    >
      {exercises.length ? (
        <p className="muted small">Repeats over all rounds, if you counted them.</p>
      ) : (
        <p className="muted">No exercise was performed.</p>
      )}
      {exercises.map((id) => {
        const ex = bwExercise(id)
        const prev = lastReps(sessions, id)
        return (
          <label key={id} className="bw-rep">
            <span>{ex.name}</span>
            {ex.hold ? (
              <span className="muted small">done</span>
            ) : (
              <input
                inputMode="numeric"
                value={reps[id] ?? ''}
                placeholder={prev ? `last ${prev.reps}` : 'reps'}
                onChange={(e) => setReps({ ...reps, [id]: e.target.value })}
              />
            )}
          </label>
        )
      })}
      <div className="row">
        <button className="primary" disabled={!valid || !exercises.length}>
          Save
        </button>
        <button type="button" onClick={onCancel}>
          Discard
        </button>
      </div>
    </form>
  )
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9.5 7.5v9l7-4.5z" fill="currentColor" />
    </svg>
  )
}
