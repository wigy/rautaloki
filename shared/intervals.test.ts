import { describe, expect, it } from 'vitest'
import { BW_DAYS, BW_EXERCISES, bwDay, bwLevel } from './bodyweight.ts'
import { bwPlan, minuteCall, planSeconds, stretchPlan } from './intervals.ts'
import {
  addSession,
  doneThisWeek,
  lastReps,
  newSession,
  proposedHold,
  proposedWork,
  removeSession,
  stepHold,
  stepWork,
} from './sessions.ts'
import { ROUTINES, routine, STRETCHES } from './stretching.ts'
import type { Session, User } from './types.ts'

const day1 = bwDay('bw-day-1')!

describe('body weight plan', () => {
  it('runs three rounds of the day like time2xercise', () => {
    const plan = bwPlan(day1, 40)
    const work = plan.filter((s) => s.kind === 'work')
    expect(work).toHaveLength(3 * day1.exercises.length)
    expect(work.every((s) => s.duration === 40)).toBe(true)
    expect(work.map((s) => s.title).slice(0, 4)).toEqual(['Plank', 'Lunge', 'Push Up', 'Star Jump'])
    // 10 s ready, per round 4 × 40 s work and 3 × 20 s rest, 2 round breaks of 60 s.
    expect(planSeconds(plan)).toBe(10 + 3 * (4 * 40 + 3 * 20) + 2 * 60)
    // time2xercise's BW sounds: start, then 3, 2, 1 in the last seconds.
    expect(work[0].cues).toEqual([
      { at: 0, say: 'go' },
      { at: 37, say: '3' },
      { at: 38, say: '2' },
      { at: 39, say: '1' },
    ])
    expect(plan[0].cues[0].say).toBe('get ready. Plank')
    expect(plan[2]).toMatchObject({ kind: 'rest', duration: 20, title: 'Lunge' })
    expect(plan[2].cues[0].say).toBe('rest. next, Lunge')
    const breaks = plan.filter((s) => s.kind === 'rest' && s.duration === 60)
    expect(breaks.map((s) => s.cues.at(-1))).toEqual([
      { at: 54, say: 'second round. Plank' },
      { at: 54, say: 'last round. Plank' },
    ])
  })

  it('has no rest at 60:00, the next exercise is called by name', () => {
    const plan = bwPlan(day1, 60)
    expect(plan.filter((s) => s.kind === 'rest')).toHaveLength(2)
    expect(plan[2]).toMatchObject({ kind: 'work', title: 'Lunge' })
    expect(plan[2].cues[0].say).toBe('Lunge')
    expect(bwLevel(60)).toBe('60:00')
    expect(bwLevel(35)).toBe('35:25')
  })

  it('knows every exercise of every day', () => {
    const ids = new Set(BW_EXERCISES.map((e) => e.id))
    for (const d of BW_DAYS) for (const e of d.exercises) expect(ids.has(e), e).toBe(true)
  })
})

describe('stretching plan', () => {
  it('holds each static stretch twice per side, alternating', () => {
    const plan = stretchPlan(routine('full-body')!, 30)
    const calf = plan.filter((s) => s.kind === 'work' && s.item === 0)
    expect(calf.map((s) => s.detail)).toEqual([
      'Left side · hold 1/2',
      'Right side · hold 1/2',
      'Left side · hold 2/2',
      'Right side · hold 2/2',
    ])
    expect(calf.every((s) => s.duration === 30)).toBe(true)
    expect(calf[1].cues[0].say).toBe('right side, hold')
    const butterfly = plan.filter((s) => s.kind === 'work' && s.title === 'Butterfly stretch')
    expect(butterfly.map((s) => s.detail)).toEqual(['hold 1/2', 'hold 2/2'])
    expect(plan.find((s) => s.kind === 'rest' && s.title === 'Standing quad stretch')!.cues[0].say).toBe(
      'release. next, Standing quad stretch',
    )
  })

  it('moves once through each dynamic move, per side where it has sides', () => {
    const plan = stretchPlan(routine('warm-up')!, 60)
    const swings = plan.filter((s) => s.kind === 'work' && s.title === 'Leg swings, front to back')
    expect(swings.map((s) => [s.detail, s.duration])).toEqual([
      ['Left side', 20],
      ['Right side', 20],
    ])
    expect(planSeconds(plan) / 60).toBeGreaterThan(5)
    expect(planSeconds(plan) / 60).toBeLessThan(10)
  })

  it('knows every stretch of every routine', () => {
    const ids = new Set(STRETCHES.map((s) => s.id))
    for (const r of ROUTINES) for (const s of r.stretches) expect(ids.has(s), s).toBe(true)
  })
})

describe('stopwatch', () => {
  it('calls the minutes', () => {
    expect(minuteCall(1)).toBe('1 minute')
    expect(minuteCall(2)).toBe('2 minutes')
  })
})

describe('sessions', () => {
  const user: User = { id: 'u', name: 'U', cycles: [] }
  const s = (date: string, plan: string, seconds: number, reps: number | null = null): Session => ({
    id: `${date}-${plan}`,
    kind: 'bodyweight',
    plan,
    date,
    seconds,
    exercises: [{ id: 'bw-push-up', reps }],
  })

  it('proposes the last level of the day, else of any day, else 30:30', () => {
    expect(proposedWork([], 'bw-day-1')).toBe(30)
    const list = [s('2026-11-02', 'bw-day-1', 40), s('2026-11-05', 'bw-day-2', 45)]
    expect(proposedWork(list, 'bw-day-1')).toBe(40)
    expect(proposedWork(list, 'bw-day-3')).toBe(45)
    expect(stepWork(60, 1)).toBe(60)
    expect(stepWork(30, -1)).toBe(30)
    expect(stepWork(40, 1)).toBe(45)
    expect(proposedHold([], 'full-body')).toBe(30)
    expect(stepHold(15, -1)).toBe(15)
  })

  it('finds the latest counted repeats', () => {
    const list = [s('2026-11-02', 'bw-day-1', 40, 30), s('2026-11-09', 'bw-day-1', 45, null), s('2026-11-01', 'bw-day-1', 35, 20)]
    expect(lastReps(list, 'bw-push-up')).toEqual({ reps: 30, seconds: 40, date: '2026-11-02' })
    expect(lastReps(list, 'bw-plank')).toBeNull()
  })

  it('ticks a day done in the current Monday to Sunday week', () => {
    const list = [s('2026-11-23', 'bw-day-1', 40)]
    expect(doneThisWeek(list, 'bw-day-1', '2026-11-29')).toBe(true)
    expect(doneThisWeek(list, 'bw-day-1', '2026-11-30')).toBe(false)
    expect(doneThisWeek(list, 'bw-day-2', '2026-11-24')).toBe(false)
  })

  it('adds sessions with unique ids and removes them', () => {
    const a = newSession(user, 'bodyweight', 'bw-day-1', '2026-11-24', 40, [])
    const u1 = addSession(user, a)
    const b = newSession(u1, 'bodyweight', 'bw-day-1', '2026-11-24', 40, [])
    expect([a.id, b.id]).toEqual(['2026-11-24-bw-day-1', '2026-11-24-bw-day-1-2'])
    const u2 = addSession(u1, b)
    expect(removeSession(u2, a.id).sessions).toEqual([b])
  })
})
