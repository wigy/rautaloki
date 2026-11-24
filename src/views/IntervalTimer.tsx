import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { Interval } from '../../shared/intervals.ts'
import { say, useWakeLock } from '../speech.ts'
import { fmt, STALE } from './SetTimer.tsx'

interface Props {
  plan: Interval[]
  title: string
  subtitle: string
  /** What the phases are called, e.g. work "Hold" and rest "Change" for stretching. */
  labels: { work: string; rest: string }
  /** Picture of the exercise at an index of the plan's list. */
  picture?: (item: number) => string | undefined
  /** Shown before the start, above the Start button: settings such as the level. */
  setup?: ReactNode
  /** The final screen, given the indices of the exercises that were performed. */
  finish: (performed: number[]) => ReactNode
  onClose: () => void
}

/** A work interval counts as performed once it has run this long, or to its end. */
const PERFORMED = 3

/** Full-screen timer that runs an interval plan, speaks its cues and tracks what was done. */
export function IntervalTimer({ plan, title, subtitle, labels, picture, setup, finish, onClose }: Props) {
  const run = useRef({ i: 0, start: 0, paused: null as number | null, fired: 0, running: false, done: new Set<number>() })
  const [now, setNow] = useState(() => performance.now())
  const [over, setOver] = useState(false)
  useWakeLock()

  const r = run.current
  const seg = plan[r.i] as Interval | undefined
  const elapsed = Math.max(0, ((r.paused ?? now) - r.start) / 1000)

  /** Leave the current segment at time `t`, noting a work interval that was really done. */
  const leave = (t: number) => {
    const cur = plan[r.i]
    if (cur?.kind === 'work' && (t - r.start) / 1000 >= Math.min(PERFORMED, cur.duration)) r.done.add(cur.item)
  }
  const enter = (i: number, start: number) => {
    Object.assign(r, { i, start, fired: 0 })
    if (i >= plan.length) {
      r.running = false
      say('done')
      setOver(true)
    }
  }

  useEffect(() => {
    const tick = () => {
      const t = performance.now()
      const r = run.current
      while (r.running && r.paused === null && r.i < plan.length) {
        const seg = plan[r.i]
        const el = (t - r.start) / 1000
        while (r.fired < seg.cues.length && seg.cues[r.fired].at <= el) {
          if (el - seg.cues[r.fired].at < STALE) say(seg.cues[r.fired].say)
          r.fired++
        }
        if (el < seg.duration) break
        const end = r.start + seg.duration * 1000
        leave(end)
        enter(r.i + 1, end)
      }
      setNow(t)
    }
    const id = setInterval(tick, 100)
    return () => {
      clearInterval(id)
      window.speechSynthesis?.cancel()
    }
  }, [plan])

  const start = () => {
    // Speak from the tap itself: mobile browsers only allow speech that starts from a user gesture.
    say(plan[0].cues[0]?.say ?? '')
    Object.assign(r, { i: 0, start: performance.now(), paused: null, fired: 1, running: true, done: new Set() })
    setNow(performance.now())
  }
  const togglePause = () => {
    const t = performance.now()
    if (r.paused === null) {
      r.paused = t
      window.speechSynthesis?.cancel()
    } else {
      r.start += t - r.paused
      r.paused = null
    }
    setNow(t)
  }
  const skip = () => {
    const t = r.paused ?? performance.now()
    leave(t)
    enter(r.i + 1, performance.now())
    if (r.paused !== null) r.paused = performance.now()
    setNow(performance.now())
  }
  const end = () => {
    leave(r.paused ?? performance.now())
    r.running = false
    window.speechSynthesis?.cancel()
    setOver(true)
  }

  // p or space pauses, for a phone on a stand with a keyboard.
  const keys = useRef((_: KeyboardEvent) => {})
  keys.current = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || !(e.key === 'p' || e.key === ' ')) return
    if (e.target instanceof HTMLInputElement) return
    e.preventDefault()
    if (r.running && seg) togglePause()
  }
  useEffect(() => {
    const on = (e: KeyboardEvent) => keys.current(e)
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const total = plan.reduce((n, s) => n + s.duration, 0)
  let body
  if (over) {
    body = finish([...r.done].sort((a, b) => a - b))
  } else if (!r.running) {
    body = (
      <>
        {setup}
        <p className="muted">About {Math.round(total / 60)} min</p>
        <button className="primary timer-main" onClick={start}>
          Start
        </button>
      </>
    )
  } else if (seg) {
    const left = Math.max(0, seg.duration - elapsed)
    const next = seg.kind === 'work' ? plan.slice(r.i + 1).find((s) => s.kind === 'work' && s.item !== seg.item) : null
    const tone = seg.kind === 'work' ? 'lift' : seg.kind
    const art = picture?.(seg.item)
    body = (
      <>
        {art && <img className="interval-art" src={art} alt="" />}
        <div className={`timer-phase ${tone}`}>
          {seg.kind === 'ready' ? 'Get ready' : seg.kind === 'work' ? labels.work : labels.rest}
        </div>
        <div className="interval-title">
          {seg.kind === 'work' ? '' : 'Next: '}
          {seg.title}
        </div>
        <div className="muted">{seg.detail}</div>
        <div className={`timer-big ${tone}`}>{fmt(Math.ceil(left))}</div>
        <div className="timer-bar">
          <div style={{ width: `${Math.min(100, (elapsed / seg.duration) * 100)}%` }} />
        </div>
        <div className="muted small interval-next">{next ? `Then: ${next.title}` : ' '}</div>
        <button className="timer-main" onClick={togglePause}>
          {r.paused === null ? 'Pause' : 'Resume'}
        </button>
        <div className="row timer-row">
          <button onClick={skip}>Skip</button>
          <button onClick={end}>Finish now</button>
        </div>
      </>
    )
  }

  return (
    <div className="timer" role="dialog" aria-label={`${title} timer`}>
      <div className="timer-head">
        <div className="timer-title">
          <strong>{title}</strong>
          <div className="muted small">{subtitle}</div>
        </div>
        <button className="link" onClick={onClose}>
          ← Back
        </button>
      </div>
      <div className="timer-body">{body}</div>
    </div>
  )
}
