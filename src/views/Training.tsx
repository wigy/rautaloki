import { useEffect, useMemo, useState } from 'react'
import { timerPlan } from '../../shared/timer.ts'
import { currentWeek, finishCycle, plan, recordScore, today, undoScore } from '../../shared/training.ts'
import type { Cycle, Program } from '../../shared/types.ts'
import type { Ctx } from '../App.tsx'
import empty from '../assets/empty.webp'
import { GENERAL, HOWTO } from '../howto.ts'
import { exerciseIcon } from '../icons.ts'
import { exercise, fmtDate, kg, program } from '../lookup.ts'
import { SetTimer } from './SetTimer.tsx'

export function Training(ctx: Ctx) {
  const active = ctx.user.cycles.filter((c) => !c.done)
  if (!active.length) {
    return (
      <div className="empty">
        <img className="empty-art" src={empty} alt="" />
        <p>No cycle in progress.</p>
        <button className="primary" onClick={() => ctx.go('new')}>
          Start a new cycle
        </button>
      </div>
    )
  }
  return (
    <>
      {active.map((c) => (
        <CycleCard key={c.id} ctx={ctx} cycle={c} />
      ))}
    </>
  )
}

function CycleCard({ ctx, cycle }: { ctx: Ctx; cycle: Cycle }) {
  const ex = exercise(ctx.data, cycle.exercise)
  const prog = program(ctx.data, cycle.program)
  const icon = exerciseIcon(cycle.exercise)
  const p = prog ? plan(cycle, prog, ex, ctx.data.weights) : null
  const suggested = p?.load?.total ?? p?.proposal ?? null
  const [value, setValue] = useState(suggested?.toString() ?? '')
  const [timing, setTiming] = useState(false)
  const [howTo, setHowTo] = useState(false)
  const tempo = ctx.user.tempo?.[cycle.exercise] ?? 1
  const segments = useMemo(() => (p ? timerPlan(p.scheme, tempo) : null), [p?.scheme, tempo])
  useEffect(() => setValue(suggested?.toString() ?? ''), [suggested, p?.week])

  const change = (fn: (c: Cycle) => Cycle) =>
    ctx.update((u) => ({ ...u, cycles: u.cycles.map((c) => (c.id === cycle.id ? fn(c) : c)) }))

  const save = (score: number | '-') => {
    if (!prog) return
    change((c) => recordScore(c, prog, score, today()))
  }
  const n = Number(value.replace(',', '.'))
  const valid = value.trim() !== '' && Number.isFinite(n) && n >= 0
  const week = currentWeek(cycle)
  const hasScores = cycle.scores.some((s) => s !== null)
  // Quarter-kilo steps, rounded so repeated taps do not drift in floating point.
  const adjust = (step: number) => change((c) => ({ ...c, add: Math.round((c.add + step) * 4) / 4 }))
  const end = () => {
    if (confirm(`End ${ex.name} now? The old best is kept.`))
      change((c) => ({ ...c, done: true, finished: today(), newBest: c.oldBest }))
  }
  const remove = () => {
    if (confirm(`Delete this ${ex.name} cycle and its scores?`))
      ctx.update((u) => ({ ...u, cycles: u.cycles.filter((c) => c.id !== cycle.id) }))
  }

  return (
    <section className="card">
      <div className="card-title">
        {icon && <img className="ex-icon" src={icon} alt="" />}
        <div className="card-head">
          <h2>{ex.name}</h2>
          <span className="muted">
            {prog?.name ?? cycle.program} · started {fmtDate(cycle.started)}
          </span>
        </div>
      </div>

      <Weeks cycle={cycle} prog={prog} />

      {!prog ? (
        <p className="error">Unknown program “{cycle.program}”.</p>
      ) : p ? (
        <div className="plan">
          <div className="plan-week">
            Week {p.week + 1}/{prog.weeks.length}
            <strong className={p.isTest ? 'test' : ''}>{p.scheme}</strong>
            {segments && (
              <button type="button" className="timer-open" onClick={() => setTiming(true)}>
                ▶ Timer
              </button>
            )}
          </div>
          {timing && segments && (
            <SetTimer
              segments={segments}
              title={ex.name}
              icon={icon}
              scheme={p.scheme}
              weight={[kg(p.load?.total ?? p.proposal), p.plates].filter(Boolean).join(' · ')}
              tempo={tempo}
              onTempo={(t) =>
                ctx.update((u) => {
                  const { [cycle.exercise]: _, ...rest } = u.tempo ?? {}
                  return { ...u, tempo: t === 1 ? rest : { ...rest, [cycle.exercise]: t } }
                })
              }
              onClose={() => setTiming(false)}
            />
          )}
          {p.proposal === null ? (
            <OldBest onSet={(ob) => change((c) => ({ ...c, oldBest: c.oldBest ?? ob }))} />
          ) : (
            <>
              <div className="plan-kg">{kg(p.load?.total ?? p.proposal)}</div>
              <div className="plan-plates">{p.plates}</div>
              <div className="muted small">
                Plan {kg(p.target)} · old best {kg(cycle.oldBest)}
              </div>
              <div className="adjust">
                <button type="button" onClick={() => adjust(-0.25)} aria-label="Lower the proposal by 0.25 kg">
                  −
                </button>
                <span>
                  Adjust {cycle.add > 0 ? '+' : ''}
                  {cycle.add} kg
                </span>
                <button type="button" onClick={() => adjust(0.25)} aria-label="Raise the proposal by 0.25 kg">
                  +
                </button>
              </div>
            </>
          )}
          <form
            className="entry"
            onSubmit={(e) => {
              e.preventDefault()
              if (valid) save(n)
            }}
          >
            <input
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label={`Kg lifted, week ${week + 1}`}
            />
            <button className="primary" disabled={!valid}>
              {p.isTest ? 'Save test' : 'Save'}
            </button>
            <button type="button" onClick={() => save('-')}>
              Skip
            </button>
          </form>
        </div>
      ) : (
        <div className="plan">
          <p className="muted">All weeks are recorded, but the cycle was never closed.</p>
          <button className="primary" onClick={() => change((c) => finishCycle(c, prog, today()))}>
            Finish cycle
          </button>
        </div>
      )}

      <div className="card-actions">
        {hasScores && (
          <button className="link" onClick={() => change(undoScore)}>
            Undo last
          </button>
        )}
        <button className="link" onClick={() => setHowTo(!howTo)}>
          {howTo ? 'Close how to' : 'How to'}
        </button>
        <button className="link" onClick={() => ctx.go('history', cycle.exercise)}>
          History
        </button>
        <span className="card-actions-end">
          <button className="link end" onClick={end}>
            End cycle
          </button>
          <button className="link danger" onClick={remove}>
            Delete
          </button>
        </span>
      </div>

      {howTo && <HowToPanel id={cycle.exercise} />}

    </section>
  )
}

function HowToPanel({ id }: { id: string }) {
  const h = HOWTO[id]
  return (
    <div className="settings howto">
      {h && (
        <>
          <h3>Steps</h3>
          <ol>
            {h.steps.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
          <h3>Watch out</h3>
          <ul>
            {h.watch.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </>
      )}
      <h3>Every set</h3>
      <ul>
        {GENERAL.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  )
}

export function Weeks({ cycle, prog }: { cycle: Cycle; prog?: Program }) {
  const week = currentWeek(cycle)
  return (
    <ol className="weeks">
      {cycle.scores.map((s, w) => (
        <li
          key={w}
          className={[w === week ? 'current' : '', s === '-' ? 'skipped' : '', s === null ? 'open' : ''].join(' ')}
          title={prog?.weeks[w] ? `Week ${w + 1}: ${prog.weeks[w].scheme}` : `Week ${w + 1}`}
        >
          <span className="wk">{prog?.weeks[w]?.scheme === 'TEST' ? 'T' : w + 1}</span>
          <span className="sc">{s === null ? '' : s}</span>
        </li>
      ))}
    </ol>
  )
}

/** The old best is fixed once set: targets and performances are all relative to it. */
function OldBest({ onSet }: { onSet: (kg: number) => void }) {
  const [value, setValue] = useState('')
  const n = Number(value.replace(',', '.'))
  const valid = value.trim() !== '' && Number.isFinite(n) && n > 0
  return (
    <>
      <p className="muted">Set an old best to get weight proposals.</p>
      <form
        className="entry"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSet(n)
        }}
      >
        <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Old best (kg)" />
        <button className="primary" disabled={!valid}>
          Set old best
        </button>
      </form>
    </>
  )
}
