// Body weight and stretching sessions in the user's file: what to propose next time and
// how to record a session, kept apart from the weight lifting cycles.

import { BW_WORK_MAX, BW_WORK_MIN, BW_WORK_STEP } from './bodyweight.ts'
import { HOLD_DEFAULT, HOLD_MAX, HOLD_MIN, HOLD_STEP } from './stretching.ts'
import { weekStart } from './training.ts'
import type { Performed, Session, User } from './types.ts'

export function sessionsOf(user: User, kind: Session['kind']): Session[] {
  return (user.sessions ?? []).filter((s) => s.kind === kind)
}

/** The latest session of a plan, by date and then by order of entry. */
export function lastOf(sessions: Session[], plan: string): Session | undefined {
  let last: Session | undefined
  for (const s of sessions) if (s.plan === plan && (!last || s.date >= last.date)) last = s
  return last
}

/** Work seconds for a body weight day: as last time on that day, else on any day, else 30:30. */
export function proposedWork(sessions: Session[], plan: string): number {
  const last = lastOf(sessions, plan) ?? sessions.reduce<Session | undefined>((a, s) => (!a || s.date >= a.date ? s : a), undefined)
  return last ? clamp(last.seconds, BW_WORK_MIN, BW_WORK_MAX) : BW_WORK_MIN
}

/** Seconds per hold for a static routine: as last time, else 30. */
export function proposedHold(sessions: Session[], plan: string): number {
  const last = lastOf(sessions, plan)
  return last ? clamp(last.seconds, HOLD_MIN, HOLD_MAX) : HOLD_DEFAULT
}

export function stepWork(work: number, dir: 1 | -1): number {
  return clamp(work + dir * BW_WORK_STEP, BW_WORK_MIN, BW_WORK_MAX)
}

export function stepHold(hold: number, dir: 1 | -1): number {
  return clamp(hold + dir * HOLD_STEP, HOLD_MIN, HOLD_MAX)
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/** The latest counted repeats of an exercise, with the work seconds they were done at. */
export function lastReps(sessions: Session[], exercise: string): { reps: number; seconds: number; date: string } | null {
  let best: { reps: number; seconds: number; date: string } | null = null
  for (const s of sessions) {
    const p = s.exercises.find((e) => e.id === exercise && e.reps !== null)
    if (p && (!best || s.date >= best.date)) best = { reps: p.reps!, seconds: s.seconds, date: s.date }
  }
  return best
}

export function doneThisWeek(sessions: Session[], plan: string, today: string): boolean {
  const week = weekStart(today)
  return sessions.some((s) => s.plan === plan && weekStart(s.date) === week)
}

/** A new session with an id unique in the user's file. */
export function newSession(
  user: User,
  kind: Session['kind'],
  plan: string,
  date: string,
  seconds: number,
  exercises: Performed[],
): Session {
  const ids = new Set((user.sessions ?? []).map((s) => s.id))
  const base = `${date}-${plan}`
  let id = base
  for (let n = 2; ids.has(id); n++) id = `${base}-${n}`
  return { id, kind, plan, date, seconds, exercises }
}

export function addSession(user: User, session: Session): User {
  return { ...user, sessions: [...(user.sessions ?? []), session] }
}

export function removeSession(user: User, id: string): User {
  return { ...user, sessions: (user.sessions ?? []).filter((s) => s.id !== id) }
}
