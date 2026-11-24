import { useMemo, useState } from 'react'
import { planSeconds, stretchPlan } from '../../shared/intervals.ts'
import { addSession, doneThisWeek, lastOf, newSession, proposedHold, sessionsOf, stepHold } from '../../shared/sessions.ts'
import {
  DYNAMIC_MOVE,
  HOLD_MAX,
  HOLD_MIN,
  ROUTINES,
  type Routine,
  routine as routineById,
  STATIC_HOLDS,
  STRETCH_GENERAL,
  stretch,
} from '../../shared/stretching.ts'
import { today } from '../../shared/training.ts'
import type { Session, Span } from '../../shared/types.ts'
import type { Ctx } from '../App.tsx'
import { stretchIcon } from '../icons.ts'
import { fmtDate } from '../lookup.ts'
import { PlayIcon } from './BodyWeight.tsx'
import { HowToItem, ListItem } from './HowToItem.tsx'
import { IntervalTimer } from './IntervalTimer.tsx'
import { SessionList } from './Sessions.tsx'

export function Stretching(ctx: Ctx) {
  const sessions = sessionsOf(ctx.user, 'stretch')
  const now = today()
  const routines = [...ROUTINES].sort(
    (a, b) => Number(doneThisWeek(sessions, a.id, now)) - Number(doneThisWeek(sessions, b.id, now)),
  )
  return (
    <>
      <p className="muted intro">
        Warm up with dynamic moves before lifting; hold static stretches after training or on a rest day.
      </p>
      {routines.map((r) => (
        <RoutineCard key={r.id} ctx={ctx} routine={r} sessions={sessions} doneNow={doneThisWeek(sessions, r.id, now)} />
      ))}
      <SessionList
        sessions={sessions}
        update={ctx.update}
        planName={(id) => routineById(id)?.name ?? id}
        exerciseName={(id) => stretch(id).name}
        level={(s) => (routineById(s.plan)?.kind === 'dynamic' ? 'dynamic' : `hold ${s.seconds} s`)}
      />
    </>
  )
}

function RoutineCard({
  ctx,
  routine,
  sessions,
  doneNow,
}: {
  ctx: Ctx
  routine: Routine
  sessions: Session[]
  doneNow: boolean
}) {
  const dynamic = routine.kind === 'dynamic'
  const [hold, setHold] = useState(() => proposedHold(sessions, routine.id))
  const [timing, setTiming] = useState(false)
  const [howTo, setHowTo] = useState(false)
  const plan = useMemo(() => stretchPlan(routine, hold), [routine, hold])
  const minutes = Math.round(planSeconds(plan) / 60)
  const last = lastOf(sessions, routine.id)

  // A dynamic routine has no hold to choose; its seconds record the length of a move.
  const save = (done: string[], span?: Span) => {
    const seconds = dynamic ? DYNAMIC_MOVE : hold
    ctx.update((u) =>
      addSession(u, newSession(u, 'stretch', routine.id, today(), seconds, done.map((id) => ({ id, reps: null })), span)),
    )
    setTiming(false)
  }
  const holdControl = !dynamic && (
    <div className="adjust">
      <button onClick={() => setHold(stepHold(hold, -1))} disabled={hold <= HOLD_MIN} aria-label="Shorter">
        −
      </button>
      <span>Hold {hold} s</span>
      <button onClick={() => setHold(stepHold(hold, 1))} disabled={hold >= HOLD_MAX} aria-label="Longer">
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
          <h2>{routine.name}</h2>
          <span className="muted">
            {dynamic ? 'Dynamic' : `Static, ${STATIC_HOLDS} holds per side`} · about {minutes} min
            {last ? ` · last ${fmtDate(last.date)}` : ''}
          </span>
        </div>
      </div>
      <p className="small">{routine.about}</p>
      <ul className="bw-list">
        {routine.stretches.map((id) => {
          const s = stretch(id)
          return <ListItem key={id} name={s.name} icon={stretchIcon(id)} note={s.target} />
        })}
      </ul>
      <div className="plan">
        {holdControl}
        <button type="button" className="exercise-now" onClick={() => setTiming(true)}>
          <PlayIcon />
          Stretch Now
        </button>
        {timing && (
          <IntervalTimer
            plan={plan}
            title={routine.name}
            subtitle={dynamic ? `Dynamic · about ${minutes} min` : `Hold ${hold} s · about ${minutes} min`}
            labels={dynamic ? { work: 'Move', rest: 'Next' } : { work: 'Hold', rest: 'Change' }}
            picture={(i) => stretchIcon(routine.stretches[i])}
            howTo={(i) => {
              const s = stretch(routine.stretches[i])
              return <HowToItem name={s.sides ? `${s.name}, each side` : s.name} steps={s.steps} watch={s.watch} />
            }}
            setup={
              <>
                <div className="timer-phase">{routine.name}</div>
                <p className="muted">
                  {routine.stretches.length} {dynamic ? 'moves' : 'stretches'}
                  {dynamic ? '' : `, ${STATIC_HOLDS} holds per side`}
                </p>
                {holdControl}
              </>
            }
            finish={(done, span) => (
              <StretchDone
                done={done.map((i) => routine.stretches[i])}
                onSave={(d) => save(d, span)}
                onCancel={() => setTiming(false)}
              />
            )}
            onClose={() => setTiming(false)}
          />
        )}
      </div>
      <div className="card-actions">
        <button className="link" onClick={() => save(routine.stretches)}>
          Log without timer
        </button>
        <button className="link" onClick={() => setHowTo(!howTo)}>
          {howTo ? 'Close how to' : 'How to'}
        </button>
      </div>
      {howTo && (
        <div className="settings howto">
          {routine.stretches.map((id) => {
            const s = stretch(id)
            return (
              <HowToItem
                key={id}
                name={s.sides ? `${s.name}, each side` : s.name}
                icon={stretchIcon(id)}
                steps={s.steps}
                watch={s.watch}
              />
            )
          })}
          <h3>Every session</h3>
          <ul>
            {STRETCH_GENERAL.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function StretchDone({ done, onSave, onCancel }: { done: string[]; onSave: (done: string[]) => void; onCancel: () => void }) {
  return (
    <>
      <div className="timer-phase">Done</div>
      {done.length ? (
        <p className="muted">
          {done.length} done: {done.map((id) => stretch(id).name).join(', ')}
        </p>
      ) : (
        <p className="muted">No stretch was performed.</p>
      )}
      <button className="primary timer-main" onClick={() => onSave(done)} disabled={!done.length}>
        Save
      </button>
      <div className="row timer-row">
        <button onClick={onCancel}>Discard</button>
      </div>
    </>
  )
}
