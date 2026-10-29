import { useEffect, useMemo, useState } from 'react'
import { timerPlan } from '../../shared/timer.ts'
import { currentWeek, finishCycle, plan, recordScore, today, undoScore } from '../../shared/training.ts'
import type { Cycle, Program } from '../../shared/types.ts'
import type { Ctx } from '../App.tsx'
import empty from '../assets/empty.webp'
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
  const [editing, setEditing] = useState(false)
  const [timing, setTiming] = useState(false)
  const segments = useMemo(() => (p ? timerPlan(p.scheme) : null), [p?.scheme])
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

  return (
    <section className="card">
      <div className="card-title">
        {icon && <img className="ex-icon" src={icon} alt="" />}
        <div className="card-head">
          <h2>
            {ex.url ? (
              <a href={ex.url} target="_blank" rel="noreferrer">
                {ex.name}
              </a>
            ) : (
              ex.name
            )}
          </h2>
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
              onClose={() => setTiming(false)}
            />
          )}
          {p.proposal === null ? (
            <p className="muted">Set an old best to get weight proposals.</p>
          ) : (
            <>
              <div className="plan-kg">{kg(p.load?.total ?? p.proposal)}</div>
              <div className="plan-plates">{p.plates}</div>
              <div className="muted small">
                Plan {kg(p.target)} · old best {kg(cycle.oldBest)}
                {cycle.add ? ` · adjust ${cycle.add > 0 ? '+' : ''}${cycle.add} kg` : ''}
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
        <button className="link" onClick={() => setEditing(!editing)}>
          {editing ? 'Close settings' : 'Settings'}
        </button>
        <button className="link" onClick={() => ctx.go('history', cycle.exercise)}>
          History
        </button>
      </div>

      {editing && (
        <Settings
          cycle={cycle}
          onChange={change}
          onEnd={() => {
            if (confirm(`End ${ex.name} now? The old best is kept.`))
              change((c) => ({ ...c, done: true, finished: today(), newBest: c.oldBest }))
          }}
          onDelete={() => {
            if (confirm(`Delete this ${ex.name} cycle and its scores?`))
              ctx.update((u) => ({ ...u, cycles: u.cycles.filter((c) => c.id !== cycle.id) }))
          }}
        />
      )}
    </section>
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

function Settings({
  cycle,
  onChange,
  onEnd,
  onDelete,
}: {
  cycle: Cycle
  onChange: (fn: (c: Cycle) => Cycle) => void
  onEnd: () => void
  onDelete: () => void
}) {
  const [oldBest, setOldBest] = useState(cycle.oldBest?.toString() ?? '')
  const [add, setAdd] = useState(cycle.add.toString())
  const parse = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))
  const ob = parse(oldBest)
  const ad = parse(add) ?? 0
  const valid = (ob === null || Number.isFinite(ob)) && Number.isFinite(ad)
  return (
    <form
      className="settings"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onChange((c) => ({ ...c, oldBest: ob, add: ad }))
      }}
    >
      <label>
        Old best (kg)
        <input inputMode="decimal" value={oldBest} onChange={(e) => setOldBest(e.target.value)} />
      </label>
      <label>
        Adjust proposal (kg)
        <input inputMode="decimal" value={add} onChange={(e) => setAdd(e.target.value)} />
      </label>
      <div className="row">
        <button className="primary" disabled={!valid}>
          Apply
        </button>
        <button type="button" onClick={onEnd}>
          End cycle
        </button>
        <button type="button" className="danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </form>
  )
}
