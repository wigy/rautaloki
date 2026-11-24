// Timed plans for body weight and stretching sessions, run by the UI's interval timer,
// plus the stopwatch's calls. Like shared/timer.ts, a plan is a list of segments, each
// with what to say how many seconds into it.

import { BW_INTERVAL, BW_ROUND_BREAK, BW_ROUNDS, type BwDay, bwExercise } from './bodyweight.ts'
import {
  DYNAMIC_MOVE,
  DYNAMIC_SIDE,
  type Routine,
  SIDE_CHANGE,
  STATIC_HOLDS,
  STRETCH_CHANGE,
  stretch,
} from './stretching.ts'
import type { Cue } from './timer.ts'

export interface Interval {
  kind: 'ready' | 'work' | 'rest'
  /** Index in the day's or routine's list of the exercise this segment is or leads to. */
  item: number
  /** Name of that exercise. */
  title: string
  /** Where in the session this is, e.g. "Round 2/3" or "Left side · hold 1/2". */
  detail: string
  duration: number
  cues: Cue[]
}

export const READY = 10
const ROUND_CALL = 6
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth']

/** The last three seconds of a work interval counted "3", "2", "1". */
function countdown(duration: number): Cue[] {
  return duration > 6 ? [3, 2, 1].map((n) => ({ at: duration - n, say: String(n) })) : []
}

/**
 * A body weight day at `work` seconds per one minute interval, as time2xercise ran it:
 * three rounds of the day's exercises, work then rest, a minute between rounds, and the
 * last three seconds of each exercise counted down. 60:00 has no rest: the next exercise
 * starts at once.
 */
export function bwPlan(day: BwDay, work: number): Interval[] {
  const rest = BW_INTERVAL - work
  const names = day.exercises.map((id) => bwExercise(id).name)
  const out: Interval[] = [
    { kind: 'ready', item: 0, title: names[0], detail: `Round 1/${BW_ROUNDS}`, duration: READY, cues: [{ at: 0, say: `get ready. ${names[0]}` }] },
  ]
  for (let round = 1; round <= BW_ROUNDS; round++) {
    const detail = `Round ${round}/${BW_ROUNDS}`
    if (round > 1) {
      const call = round === BW_ROUNDS ? 'last round' : `${ORDINALS[round - 1]} round`
      out.push({
        kind: 'rest',
        item: 0,
        title: names[0],
        detail,
        duration: BW_ROUND_BREAK,
        cues: [
          { at: 0, say: 'round done. rest' },
          { at: BW_ROUND_BREAK - ROUND_CALL, say: `${call}. ${names[0]}` },
        ],
      })
    }
    names.forEach((title, item) => {
      // After a rest that named it, the exercise starts with "go"; with no rest, its name is the call.
      const announced = item === 0 || rest > 0
      if (item > 0 && rest > 0) {
        out.push({ kind: 'rest', item, title, detail, duration: rest, cues: [{ at: 0, say: `rest. next, ${title}` }] })
      }
      out.push({
        kind: 'work',
        item,
        title,
        detail,
        duration: work,
        cues: [{ at: 0, say: announced ? 'go' : title }, ...countdown(work)],
      })
    })
  }
  return out
}

/**
 * A stretching routine. Dynamic moves run a fixed time (per side when done per side);
 * static stretches are held `hold` seconds, STATIC_HOLDS times per side, alternating sides.
 */
export function stretchPlan(routine: Routine, hold: number): Interval[] {
  const dynamic = routine.kind === 'dynamic'
  const out: Interval[] = []
  routine.stretches.forEach((id, item) => {
    const s = stretch(id)
    const title = s.name
    const lead = item === 0 ? `get ready. ${title}` : dynamic ? `next, ${title}` : `release. next, ${title}`
    out.push({
      kind: item === 0 ? 'ready' : 'rest',
      item,
      title,
      detail: s.target,
      duration: item === 0 ? READY : dynamic ? SIDE_CHANGE : STRETCH_CHANGE,
      cues: [{ at: 0, say: lead }],
    })
    const sides: (string | null)[] = s.sides ? ['Left side', 'Right side'] : [null]
    const holds = dynamic ? 1 : STATIC_HOLDS
    const duration = dynamic ? (s.sides ? DYNAMIC_SIDE : DYNAMIC_MOVE) : hold
    let first = true
    for (let h = 1; h <= holds; h++) {
      for (const side of sides) {
        if (!first) {
          out.push({
            kind: 'rest',
            item,
            title,
            detail: side ?? s.target,
            duration: SIDE_CHANGE,
            cues: [{ at: 0, say: side ? 'switch sides' : 'release' }],
          })
        }
        first = false
        const action = dynamic ? 'go' : 'hold'
        out.push({
          kind: 'work',
          item,
          title,
          detail: [side, holds > 1 ? `hold ${h}/${holds}` : null].filter(Boolean).join(' · ') || s.target,
          duration,
          cues: [{ at: 0, say: side ? `${side.toLowerCase()}, ${action}` : action }],
        })
      }
    }
  })
  return out
}

/** Total seconds of a plan. */
export function planSeconds(plan: Interval[]): number {
  return plan.reduce((n, s) => n + s.duration, 0)
}

/** What the stopwatch says at a whole number of minutes: "1 minute", "2 minutes", ... */
export function minuteCall(minutes: number): string {
  return minutes === 1 ? '1 minute' : `${minutes} minutes`
}
