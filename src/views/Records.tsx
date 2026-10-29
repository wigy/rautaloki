import { useMemo } from 'react'
import { records } from '../../shared/training.ts'
import type { Ctx } from '../App.tsx'
import banner from '../assets/records.webp'
import { muscleIcon } from '../icons.ts'
import { exercise, fmtDate, kg } from '../lookup.ts'

export function Records(ctx: Ctx) {
  const groups = useMemo(() => {
    const recs = records(ctx.user)
    const counts = new Map<string, number>()
    for (const c of ctx.user.cycles) counts.set(c.exercise, (counts.get(c.exercise) ?? 0) + 1)
    const m = new Map<string, { id: string; name: string; best: number; date: string | null; n: number }[]>()
    for (const [id, r] of recs) {
      const ex = exercise(ctx.data, id)
      m.set(ex.mainMuscle, [...(m.get(ex.mainMuscle) ?? []), { id, name: ex.name, ...r, n: counts.get(id) ?? 0 }])
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [ctx.user, ctx.data])

  if (!groups.length) return <p className="empty">No records yet.</p>

  return (
    <section className="card">
      <img className="banner" src={banner} alt="" style={{ objectPosition: '50% 25%' }} />
      <h2>Records</h2>
      <table className="records">
        <thead>
          <tr>
            <th>Exercise</th>
            <th className="num">Best</th>
            <th>Reached</th>
            <th className="num">Cycles</th>
          </tr>
        </thead>
        {groups.map(([muscle, list]) => (
          <tbody key={muscle}>
            <tr className="group">
              <th colSpan={4}>
                {muscleIcon(muscle) && <img className="group-icon" src={muscleIcon(muscle)} alt="" />}
                {muscle}
              </th>
            </tr>
            {list.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => ctx.go('history', r.id)}>
                <td>{r.name}</td>
                <td className="num">{kg(r.best)}</td>
                <td className="muted">{fmtDate(r.date)}</td>
                <td className="num muted">{r.n}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </section>
  )
}
