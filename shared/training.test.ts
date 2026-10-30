import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  bestPerformance,
  currentWeek,
  doneThisWeek,
  finishCycle,
  newCycle,
  plan,
  recordScore,
  records,
  roundHalf,
  stepAdjust,
  target,
  today,
  undoScore,
  weekStart,
} from './training.ts'
import type { Cycle, Exercise, Program, User, Weights } from './types.ts'

// Rules are tested on fixtures/ (reference data plus an example user whose cycles carry
// numbers from the original sheets). data/ is personal and not in git; when present,
// the imported history is checked as well.
const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
const catalog = read<Exercise[]>('fixtures/catalog.json')
const programs = read<Program[]>('fixtures/programs.json')
const weights = read<Weights>('fixtures/weights.json')
const example = read<User>('fixtures/users/example.json')
const dataUsers = new URL('../data/users/', import.meta.url)
const realUsers = existsSync(dataUsers)
  ? readdirSync(dataUsers)
      .filter((f) => f.endsWith('.json'))
      .map((f) => read<User>(`data/users/${f}`))
  : []
const ex = (id: string) => catalog.find((e) => e.id === id)!
const prog = (id: string) => programs.find((p) => p.id === id)!
const active = (u: User, exercise: string) => u.cycles.find((c) => !c.done && c.exercise === exercise)!

describe('targets and proposals match the old sheets', () => {
  it('deadlift, 5 x 5 week 3: 62.5 kg on the barbell', () => {
    const c = active(example, 'deadlift')
    const p = plan(c, prog('5-x-5'), ex('deadlift'), weights)!
    expect(p.week).toBe(2)
    expect(p.target).toBe(62.5)
    expect(p.proposal).toBe(62.5)
    expect(p.load?.total).toBe(62.5)
    expect(p.plates).toBe('6 × 1 kg, 2 × 2.25 kg, 2 × 2.5 kg, 2 × 5 kg, 2 × 15 kg')
  })

  it('DB shoulder press, week 2: target 9.5, proposal 3.5 after a weak week 1', () => {
    const c = active(example, 'db-shoulder-press')
    const p = plan(c, prog('short-original'), ex('db-shoulder-press'), weights)!
    expect(p.target).toBe(9.5)
    expect(p.proposal).toBe(3.5)
    expect(p.plates).toBe('4 × 1.25 kg')
  })

  it('curl: target 15.5, proposal falls to the empty 7 kg bar', () => {
    const c = active(example, 'curl')
    const p = plan(c, prog('original'), ex('curl'), weights)!
    expect(p.target).toBe(15.5)
    expect(p.load?.total).toBe(7)
    expect(p.plates).toBe('no plates')
  })
})

describe('history', () => {
  it('records take the best of all cycles, dated when reached', () => {
    expect(records(example).get('incline-bench-press')).toEqual({ best: 46, date: '2026-03-01' })
  })

  it('the first incline bench cycle scored above plan from week 1', () => {
    const c = example.cycles.find((c) => c.exercise === 'incline-bench-press')!
    expect(target(c, prog('original'), 0)).toBe(16) // 27 * 0.6 = 16.2
    expect(bestPerformance(c, prog('original'))).toBeCloseTo(39.5 / roundHalf(27 * 1.1))
  })

  it.skipIf(!realUsers.length)('imported data: finished cycles have newBest = max(oldBest, test)', () => {
    for (const u of realUsers) {
      for (const c of u.cycles) {
        const p = prog(c.program)
        const t = p.weeks.findIndex((w) => w.scheme === 'TEST')
        const s = c.scores[t]
        if (c.done && typeof s === 'number' && c.oldBest !== null) {
          expect(c.newBest, `${u.id} ${c.id}`).toBe(Math.max(c.oldBest, s))
        }
      }
    }
  })
})

describe('recording', () => {
  const p = prog('10-x-10')

  it('runs a cycle to its test week and closes it with the new best', () => {
    let c = newCycle('bench-press', p, 50, '2026-10-01')
    for (let w = 0; w < 4; w++) c = recordScore(c, p, 30, '2026-10-01')
    expect(c.done).toBe(false)
    expect(currentWeek(c)).toBe(4)
    c = recordScore(c, p, 54, '2026-10-29')
    expect(c).toMatchObject({ done: true, finished: '2026-10-29', newBest: 54 })
  })

  it('a skipped or weaker test keeps the old best', () => {
    let c = newCycle('bench-press', p, 50, '2026-10-01')
    for (let w = 0; w < 4; w++) c = recordScore(c, p, '-', '2026-10-01')
    expect(recordScore(c, p, '-', '2026-10-29').newBest).toBe(50)
    expect(recordScore(c, p, 45, '2026-10-29').newBest).toBe(50)
  })

  it('finishing a fully recorded but open cycle takes the test result', () => {
    const c = { ...newCycle('deadlift', prog('5-x-5'), 81, '2021-11-09'), scores: [57, 57, 57, 57, 57, 57] }
    expect(finishCycle(c, prog('5-x-5'), '2026-10-29')).toMatchObject({ done: true, newBest: 81, finished: '2026-10-29' })
  })

  it('undo reopens a closed cycle', () => {
    let c = newCycle('bench-press', p, 50, '2026-10-01')
    for (let w = 0; w < 5; w++) c = recordScore(c, p, 40, '2026-10-01')
    c = undoScore(c)
    expect(c).toMatchObject({ done: false, finished: null, newBest: null })
    expect(currentWeek(c)).toBe(4)
  })
})

describe('training week', () => {
  const p = prog('10-x-10')

  it('dates are Helsinki dates, whatever the device zone', () => {
    // 22:30 UTC on Sunday is already Monday 00:30 in Helsinki (UTC+2 in winter).
    expect(today(new Date('2026-11-01T22:30:00Z'))).toBe('2026-11-02')
    expect(today(new Date('2026-11-01T21:30:00Z'))).toBe('2026-11-01')
  })

  it('weeks run from Monday to Sunday', () => {
    expect(weekStart('2026-10-26')).toBe('2026-10-26') // Monday
    expect(weekStart('2026-10-30')).toBe('2026-10-26') // Friday
    expect(weekStart('2026-11-01')).toBe('2026-10-26') // Sunday
    expect(weekStart('2026-11-02')).toBe('2026-11-02') // next Monday
  })

  it('a cycle counts as done this week from its latest entry, skips included', () => {
    let c = newCycle('bench-press', p, 50, '2026-10-01')
    expect(doneThisWeek(c, '2026-10-30')).toBe(false)
    c = recordScore(c, p, 30, '2026-10-20')
    expect(doneThisWeek(c, '2026-10-30')).toBe(false)
    c = recordScore(c, p, '-', '2026-10-26')
    expect(c.scored?.slice(0, 2)).toEqual(['2026-10-20', '2026-10-26'])
    expect(doneThisWeek(c, '2026-11-01')).toBe(true)
    expect(doneThisWeek(c, '2026-11-02')).toBe(false)
    expect(doneThisWeek(undoScore(c), '2026-10-30')).toBe(false)
  })

  it('cycles from before entry dates were kept are never done this week', () => {
    const c = example.cycles.find((c) => !c.done)!
    expect(c.scored).toBeUndefined()
    expect(doneThisWeek(c, '2026-10-30')).toBe(false)
  })
})

describe('adjusting the proposal', () => {
  // A light first week on the barbell: 10 kg * 0.5 = 5 kg, below the empty 7 kg bar.
  const p: Program = { id: 'light', name: 'Light', weeks: [{ scheme: '3 x 20', pct: 0.5 }, { scheme: 'TEST', pct: 1 }] }
  const shown = (c: Cycle) => plan(c, p, ex('curl'), weights)!.load!.total

  it('each step moves to the next loadable weight', () => {
    let c = newCycle('curl', p, 10, '2026-10-30')
    expect(shown(c)).toBe(7)
    const up = stepAdjust(c, p, weights.barbell, 1)!
    c = { ...c, add: up }
    expect(shown(c)).toBe(9)
    c = { ...c, add: stepAdjust(c, p, weights.barbell, 1)! }
    expect(shown(c)).toBe(9.5)
    c = { ...c, add: stepAdjust(c, p, weights.barbell, -1)! }
    expect(shown(c)).toBe(9)
  })

  it('cannot go below the empty bar', () => {
    const c = newCycle('curl', p, 10, '2026-10-30')
    expect(stepAdjust(c, p, weights.barbell, -1)).toBeNull()
  })
})
