import { useEffect, useRef, useState } from 'react'
import { type Segment, TEMPO_MAX, TEMPO_MIN } from '../../shared/timer.ts'

interface Props {
  segments: Segment[]
  title: string
  icon?: string
  scheme: string
  weight: string
  /** Factor on the seconds per repeat for this exercise, changeable before the start. */
  tempo: number
  onTempo: (tempo: number) => void
  onClose: () => void
}

function say(text: string) {
  const s = window.speechSynthesis
  if (!s) return
  s.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 1.1
  s.speak(u)
}

// A cue more than this late (the phone slept, the tab was hidden) is dropped rather than spoken.
const STALE = 2

/** Full-screen timer that runs the segments and speaks their cues. */
export function SetTimer({ segments, title, icon, scheme, weight, tempo, onTempo, onClose }: Props) {
  // Timing lives in a ref so the interval reads current values; `now` only drives rendering.
  const run = useRef({ i: 0, start: 0, paused: null as number | null, fired: 0, running: false })
  const [now, setNow] = useState(() => performance.now())
  useWakeLock()

  const r = run.current
  const seg = segments[r.i] as Segment | undefined
  const elapsed = Math.max(0, ((r.paused ?? now) - r.start) / 1000)

  const enter = (i: number, start: number) => {
    Object.assign(run.current, { i, start, fired: 0 })
    if (i >= segments.length) {
      run.current.running = false
      say('done')
    }
  }

  useEffect(() => {
    const tick = () => {
      const t = performance.now()
      const r = run.current
      while (r.running && r.paused === null && r.i < segments.length) {
        const seg = segments[r.i]
        const el = (t - r.start) / 1000
        while (r.fired < seg.cues.length && seg.cues[r.fired].at <= el) {
          if (el - seg.cues[r.fired].at < STALE) say(seg.cues[r.fired].say)
          r.fired++
        }
        if (seg.duration === null || el < seg.duration) break
        // Next segment starts exactly when this one ends, so a late tick does not drift.
        enter(r.i + 1, r.start + seg.duration * 1000)
      }
      setNow(t)
    }
    const id = setInterval(tick, 100)
    return () => {
      clearInterval(id)
      window.speechSynthesis?.cancel()
    }
  }, [segments])

  const start = () => {
    // Speak from the tap itself: mobile browsers only allow speech that starts from a user gesture.
    say(segments[0].cues[0]?.say ?? '')
    Object.assign(run.current, { i: 0, start: performance.now(), paused: null, fired: 1, running: true })
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
  const next = () => {
    const t = performance.now()
    enter(r.i + 1, t)
    if (r.paused !== null) r.paused = t
    setNow(t)
  }

  const lifts = segments.filter((s) => s.kind === 'lift')
  const sets = lifts.length
  const reps = lifts[0]?.duration && lifts[0].cadence ? lifts[0].duration / lifts[0].cadence : null
  const rest = segments.find((s) => s.kind === 'rest')?.duration
  // Steps of 0.1, rounded so repeated taps do not drift in floating point.
  const step = (d: number) => onTempo(Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round((tempo + d) * 10) / 10)))

  let body
  if (!r.running && r.i === 0) {
    body = (
      <>
        {icon && <img className="timer-art" src={icon} alt="" />}
        <div className="timer-phase">{scheme}</div>
        <p className="muted">
          {sets} {sets === 1 ? 'set' : 'sets'}
          {reps ? `, a repeat every ${lifts[0].cadence} s` : ', each until you stop'}
          {rest ? `, ${rest / 60} min rest` : ''}
        </p>
        {reps && (
          <div className="adjust">
            <button onClick={() => step(0.1)} disabled={tempo >= TEMPO_MAX} aria-label="Slower">
              −
            </button>
            <span>Tempo {Math.round(100 / tempo)} %</span>
            <button onClick={() => step(-0.1)} disabled={tempo <= TEMPO_MIN} aria-label="Faster">
              +
            </button>
          </div>
        )}
        <button className="primary timer-main" onClick={start}>
          Start
        </button>
      </>
    )
  } else if (!seg) {
    body = (
      <>
        <div className="timer-phase">Done</div>
        <div className="timer-big">✓</div>
        <button className="primary timer-main" onClick={onClose}>
          Close
        </button>
      </>
    )
  } else {
    const open = seg.duration === null
    const left = open ? elapsed : Math.max(0, seg.duration! - elapsed)
    const rep =
      seg.kind === 'lift' && seg.cadence && reps ? Math.min(reps, Math.floor(elapsed / seg.cadence) + 1) : null
    body = (
      <>
        <div className={`timer-phase ${seg.kind}`}>
          {seg.kind === 'ready' ? 'Get ready' : seg.kind === 'rest' ? 'Rest' : 'Lift'}
        </div>
        <div className="muted">
          {seg.kind === 'lift' ? 'Set' : 'Next set'} {seg.set}/{seg.sets}
        </div>
        <div className={`timer-big ${seg.kind}`}>{fmt(open ? Math.floor(left) : Math.ceil(left))}</div>
        <div className="timer-rep">{rep ? `Rep ${rep}/${reps}` : open ? 'Until you stop' : ' '}</div>
        {!open && (
          <div className="timer-bar">
            <div style={{ width: `${Math.min(100, (elapsed / seg.duration!) * 100)}%` }} />
          </div>
        )}
        {open ? (
          <button className="primary timer-main" onClick={next}>
            Set done
          </button>
        ) : (
          <button className="timer-main" onClick={togglePause}>
            {r.paused === null ? 'Pause' : 'Resume'}
          </button>
        )}
        <div className="row timer-row">
          {open && <button onClick={togglePause}>{r.paused === null ? 'Pause' : 'Resume'}</button>}
          <button onClick={next}>{seg.kind === 'lift' ? 'End set' : 'Skip'}</button>
        </div>
      </>
    )
  }

  return (
    <div className="timer" role="dialog" aria-label="Set timer">
      <div className="timer-head">
        {icon && <img className="ex-icon" src={icon} alt="" />}
        <div className="timer-title">
          <strong>{title}</strong>
          <div className="muted small">
            {scheme} · {weight}
          </div>
        </div>
        <button className="link" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="timer-body">{body}</div>
    </div>
  )
}

function fmt(s: number): string {
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s)
}

/** Keep the screen on while the timer is open, re-acquiring the lock when the page comes back. */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const get = () => {
      if (document.visibilityState === 'visible')
        navigator.wakeLock
          ?.request('screen')
          .then((l) => (lock = l))
          .catch(() => {})
    }
    get()
    document.addEventListener('visibilitychange', get)
    return () => {
      document.removeEventListener('visibilitychange', get)
      lock?.release().catch(() => {})
    }
  }, [])
}
