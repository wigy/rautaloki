import { useMemo, useState } from 'react'
import { newCycle, records, today } from '../../shared/training.ts'
import type { Exercise } from '../../shared/types.ts'
import type { Ctx } from '../App.tsx'
import { kg } from '../lookup.ts'

export function NewCycle(ctx: Ctx) {
  const recs = useMemo(() => records(ctx.user), [ctx.user])
  const byMuscle = useMemo(() => {
    const m = new Map<string, Exercise[]>()
    for (const e of ctx.data.catalog) m.set(e.mainMuscle, [...(m.get(e.mainMuscle) ?? []), e])
    return [...m.entries()]
  }, [ctx.data])
  const active = new Set(ctx.user.cycles.filter((c) => !c.done).map((c) => c.exercise))

  const [exId, setExId] = useState('')
  const [progId, setProgId] = useState(ctx.data.programs[0]?.id ?? '')
  const [oldBest, setOldBest] = useState('')
  const prog = ctx.data.programs.find((p) => p.id === progId)

  const pick = (id: string) => {
    setExId(id)
    setOldBest(recs.get(id)?.best.toString() ?? '')
    // Default to the program last used for this exercise.
    const last = ctx.user.cycles.findLast((c) => c.exercise === id)
    if (last && ctx.data.programs.some((p) => p.id === last.program)) setProgId(last.program)
  }

  const ob = oldBest.trim() === '' ? null : Number(oldBest.replace(',', '.'))
  const valid = exId && prog && (ob === null || (Number.isFinite(ob) && ob >= 0))

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid || !prog) return
        ctx.update((u) => ({ ...u, cycles: [...u.cycles, newCycle(exId, prog, ob, today())] }))
        ctx.go('training')
      }}
    >
      <h2>New cycle</h2>
      <label>
        Exercise
        <select value={exId} onChange={(e) => pick(e.target.value)} required>
          <option value="">Choose…</option>
          {byMuscle.map(([muscle, list]) => (
            <optgroup key={muscle} label={muscle}>
              {list.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {recs.has(e.id) ? ` (${kg(recs.get(e.id)!.best)})` : ''}
                  {active.has(e.id) ? ' (in progress)' : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label>
        Program
        <select value={progId} onChange={(e) => setProgId(e.target.value)}>
          {ctx.data.programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.weeks.length} weeks)
            </option>
          ))}
        </select>
      </label>
      {prog && (
        <ol className="program-preview">
          {prog.weeks.map((w, i) => (
            <li key={i}>
              <span className="muted">W{i + 1}</span> {w.scheme}{' '}
              <span className="muted">
                {Math.round(w.pct * 1000) / 10} %{ob ? ` ≈ ${kg(Math.round(ob * w.pct * 2) / 2)}` : ''}
              </span>
            </li>
          ))}
        </ol>
      )}
      <label>
        Old best (kg)
        <input
          inputMode="decimal"
          value={oldBest}
          onChange={(e) => setOldBest(e.target.value)}
          placeholder="your current max"
        />
      </label>
      <button className="primary" disabled={!valid}>
        Start
      </button>
    </form>
  )
}
