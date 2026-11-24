import { useEffect, useRef, useState } from 'react'
import { minuteCall } from '../../shared/intervals.ts'
import { say, unlockSpeech, useWakeLock } from '../speech.ts'

/** A plain start / stop clock that says only the whole minutes: "1 minute", "2 minutes", ... */
export function Stopwatch({ onClose }: { onClose: () => void }) {
  // Time run before the current start, and when that start was; null when stopped.
  const run = useRef({ before: 0, since: null as number | null, called: 0 })
  const [now, setNow] = useState(() => performance.now())
  useWakeLock()

  const r = run.current
  const ms = r.before + (r.since === null ? 0 : now - r.since)

  useEffect(() => {
    const id = setInterval(() => {
      const t = performance.now()
      const r = run.current
      if (r.since !== null) {
        const minutes = Math.floor((r.before + t - r.since) / 60_000)
        if (minutes > r.called) {
          r.called = minutes
          say(minuteCall(minutes))
        }
      }
      setNow(t)
    }, 200)
    return () => {
      clearInterval(id)
      window.speechSynthesis?.cancel()
    }
  }, [])

  const toggle = () => {
    const t = performance.now()
    if (r.since === null) {
      unlockSpeech()
      r.since = t
    } else {
      r.before += t - r.since
      r.since = null
    }
    setNow(t)
  }
  const reset = () => {
    Object.assign(r, { before: 0, since: null, called: 0 })
    setNow(performance.now())
  }

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'p') return
      e.preventDefault()
      toggleRef.current()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])
  const toggleRef = useRef(toggle)
  toggleRef.current = toggle

  const s = Math.floor(ms / 1000)
  const running = r.since !== null
  return (
    <div className="timer" role="dialog" aria-label="Stopwatch">
      <div className="timer-head">
        <div className="timer-title">
          <strong>Stopwatch</strong>
          <div className="muted small">Calls out every full minute</div>
        </div>
        <button className="link" onClick={onClose}>
          ← Back
        </button>
      </div>
      <div className="timer-body">
        <div className={`timer-phase ${running ? 'lift' : ''}`}>{running ? 'Running' : ms ? 'Stopped' : 'Ready'}</div>
        <div className={`timer-big stopwatch ${running ? 'lift' : ''}`}>
          {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
        </div>
        <button className={running ? 'timer-main' : 'primary timer-main'} onClick={toggle}>
          {running ? 'Stop' : ms ? 'Continue' : 'Start'}
        </button>
        <div className="row timer-row">
          <button onClick={reset} disabled={running || !ms}>
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
