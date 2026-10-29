import { Fragment, useMemo, useRef, useState } from 'react'
import { improvement, records } from '../../shared/training.ts'
import type { Cycle } from '../../shared/types.ts'
import type { Ctx } from '../App.tsx'
import { exercise, fmtDate, kg, program } from '../lookup.ts'
import { Weeks } from './Training.tsx'

export function History(ctx: Ctx & { exercise?: string; setExercise: (id: string) => void }) {
  const recs = useMemo(() => records(ctx.user), [ctx.user])
  const done = useMemo(() => [...recs.keys()].map((id) => exercise(ctx.data, id)), [recs, ctx.data])
  const selected = ctx.exercise && recs.has(ctx.exercise) ? ctx.exercise : done[0]?.id
  const cycles = ctx.user.cycles
    .filter((c) => c.exercise === selected)
    .sort((a, b) => (a.started ?? '').localeCompare(b.started ?? ''))

  if (!selected) return <p className="empty">No history yet.</p>
  const ex = exercise(ctx.data, selected)

  return (
    <section className="card">
      <select value={selected} onChange={(e) => ctx.setExercise(e.target.value)} aria-label="Exercise">
        {done
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
      </select>
      <h2>
        {ex.name} <span className="muted">best {kg(recs.get(selected)?.best)}</span>
      </h2>
      <BestChart cycles={cycles} programName={(id) => program(ctx.data, id)?.name ?? id} />
      <table className="history">
        <thead>
          <tr>
            <th>Started</th>
            <th>Program</th>
            <th className="num">Old</th>
            <th className="num">New</th>
            <th className="num">Gain</th>
          </tr>
        </thead>
        <tbody>
          {cycles
            .slice()
            .reverse()
            .map((c) => {
              const gain = improvement(c)
              return (
                <Fragment key={c.id}>
                  <tr className="cycle">
                    <td>{fmtDate(c.started)}</td>
                    <td>
                      {program(ctx.data, c.program)?.name ?? c.program}
                      {!c.done && <span className="badge">in progress</span>}
                    </td>
                    <td className="num">{c.oldBest ?? '–'}</td>
                    <td className="num">{c.done ? (c.newBest ?? '–') : ''}</td>
                    <td className="num nowrap">
                      {gain === null ? '' : `${gain > 0 ? '+' : ''}${(gain * 100).toFixed(1)} %`}
                    </td>
                  </tr>
                  <tr className="cycle-weeks">
                    <td colSpan={5}>
                      <Weeks cycle={c} prog={program(ctx.data, c.program)} />
                    </td>
                  </tr>
                </Fragment>
              )
            })}
        </tbody>
      </table>
    </section>
  )
}

interface Point {
  t: number
  date: string
  kg: number
  label: string
}

/** Best weight over time: the starting best, then each finished cycle's result. */
function points(cycles: Cycle[], programName: (id: string) => string): Point[] {
  const out: Point[] = []
  const first = cycles.find((c) => c.started && c.oldBest !== null)
  if (first) out.push({ t: Date.parse(first.started!), date: first.started!, kg: first.oldBest!, label: 'starting best' })
  for (const c of cycles) {
    if (c.done && c.finished && c.newBest !== null) {
      out.push({ t: Date.parse(c.finished), date: c.finished, kg: c.newBest, label: `after ${programName(c.program)}` })
    }
  }
  return out.sort((a, b) => a.t - b.t)
}

const W = 640
const H = 220
const PAD = { l: 44, r: 16, t: 14, b: 26 }

function niceTicks(lo: number, hi: number, n = 4): number[] {
  const step0 = (hi - lo) / n || 1
  const mag = 10 ** Math.floor(Math.log10(step0))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0)!
  const out = []
  const end = Math.ceil(hi / step) * step
  for (let v = Math.floor(lo / step) * step; v <= end + 1e-9; v += step) out.push(Math.round(v * 100) / 100)
  return out
}

function BestChart({ cycles, programName }: { cycles: Cycle[]; programName: (id: string) => string }) {
  const pts = points(cycles, programName)
  const [hover, setHover] = useState<number | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  if (pts.length < 2) return null

  const t0 = pts[0].t
  const t1 = pts[pts.length - 1].t || t0 + 1
  const yTicks = niceTicks(Math.min(...pts.map((p) => p.kg)) * 0.95, Math.max(...pts.map((p) => p.kg)) * 1.02)
  const y0 = yTicks[0]
  const y1 = yTicks[yTicks.length - 1]
  const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0 || 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => H - PAD.b - ((v - y0) / (y1 - y0 || 1)) * (H - PAD.t - PAD.b)
  const years: number[] = []
  for (let yr = new Date(t0).getFullYear() + 1; yr <= new Date(t1).getFullYear(); yr++) years.push(yr)
  const yearStep = Math.ceil(years.length / 6)

  const nearest = (clientX: number) => {
    const box = svg.current!.getBoundingClientRect()
    const px = ((clientX - box.left) / box.width) * W
    let best = 0
    pts.forEach((p, i) => {
      if (Math.abs(x(p.t) - px) < Math.abs(x(pts[best].t) - px)) best = i
    })
    setHover(best)
  }
  const h = hover === null ? null : pts[hover]

  return (
    <figure className="viz">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Best weight over time, from ${pts[0].kg} kg to ${pts[pts.length - 1].kg} kg`}
        onPointerMove={(e) => nearest(e.clientX)}
        onPointerDown={(e) => nearest(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
            <text className="tick" x={PAD.l - 6} y={y(v)} textAnchor="end" dominantBaseline="middle">
              {v}
            </text>
          </g>
        ))}
        {years
          .filter((_, i) => i % yearStep === 0)
          .map((yr) => {
            const tx = x(Date.parse(`${yr}-01-01`))
            return (
              <text key={yr} className="tick" x={tx} y={H - 8} textAnchor="middle">
                {yr}
              </text>
            )
          })}
        <polyline className="line" points={pts.map((p) => `${x(p.t)},${y(p.kg)}`).join(' ')} />
        {h && <line className="crosshair" x1={x(h.t)} x2={x(h.t)} y1={PAD.t} y2={H - PAD.b} />}
        {pts.map((p, i) => (
          <circle key={i} className={`dot ${i === hover ? 'on' : ''}`} cx={x(p.t)} cy={y(p.kg)} r={i === hover ? 6 : 4} />
        ))}
      </svg>
      {h && (
        <div className="tooltip" style={{ left: `clamp(70px, ${(x(h.t) / W) * 100}%, calc(100% - 70px))` }}>
          <strong>{kg(h.kg)}</strong>
          <span>{fmtDate(h.date)}</span>
          <span className="muted">{h.label}</span>
        </div>
      )}
      <figcaption className="muted small">Best (kg) after each cycle</figcaption>
    </figure>
  )
}
