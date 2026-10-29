import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  bestPerformance,
  currentWeek,
  finishCycle,
  newCycle,
  plan,
  recordScore,
  records,
  roundHalf,
  target,
  undoScore,
} from './training.ts'
import type { Exercise, Program, User, Weights } from './types.ts'

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
