import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { type Segment, stepTempo, tempoPercent } from '../../shared/timer.ts'

interface Props {
  segments: Segment[]
  title: string
  icon?: string
  scheme: string
  weight: string
  /** Factor on the seconds per repeat for this exercise, changeable also while running. */
  tempo: number
  onTempo: (tempo: number) => void
  /** Records the result from the done screen, like the card's Done; without it the screen only closes. */
  onDone?: () => void
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
export function SetTimer({ segments, title, icon, scheme, weight, tempo, onTempo, onDone, onClose }: Props) {
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

  // A tempo change mid-set rescales the time already lifted, so the lifter stays on the same repeat.
  const shown = useRef(segments)
  useLayoutEffect(() => {
    const was = shown.current[r.i]
    const is = segments[r.i]
    shown.current = segments
    if (was?.kind !== 'lift' || !was.cadence || !is?.cadence || was.cadence === is.cadence) return
    const t = r.paused ?? performance.now()
    r.start = t - (t - r.start) * (is.cadence / was.cadence)
  }, [segments])

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
  const reps = lifts[0]?.duration && lifts[0].cadence ? Math.round(lifts[0].duration / lifts[0].cadence) : null
  const rest = segments.find((s) => s.kind === 'rest')?.duration
  const faster = stepTempo(tempo, 1)
  const slower = stepTempo(tempo, -1)
  const running = r.running && !!seg

  // Keys for a phone on a stand with a keyboard: p or space pauses, + and - change the tempo.
  const keys = useRef((_: KeyboardEvent) => {})
  keys.current = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === 'p' || e.key === ' ') {
      e.preventDefault()
      if (running) togglePause()
    } else if (reps && (e.key === '+' || e.key === '=')) {
      onTempo(faster)
    } else if (reps && e.key === '-') {
      onTempo(slower)
    }
  }
  useEffect(() => {
    const on = (e: KeyboardEvent) => keys.current(e)
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const tempoControl = reps && (
    <div className="adjust">
      <button onClick={() => onTempo(slower)} disabled={slower === tempo} aria-label="Slower">
        −
      </button>
      <span>Tempo {tempoPercent(tempo)} %</span>
      <button onClick={() => onTempo(faster)} disabled={faster === tempo} aria-label="Faster">
        +
      </button>
    </div>
  )

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
        {tempoControl}
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
        <button className="primary timer-main" onClick={onDone ?? onClose}>
          {onDone ? 'Done' : 'Close'}
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
        {tempoControl}
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
          ← Back
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
