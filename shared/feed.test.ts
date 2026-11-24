import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { addDays, exerciseFeed } from './feed.ts'
import type { Cycle, Reference, User } from './types.ts'

const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
const ref: Reference = {
  catalog: read('fixtures/catalog.json'),
  programs: read('fixtures/programs.json'),
  weights: read('fixtures/weights.json'),
}
const example = read<User>('fixtures/users/example.json')

// A Wednesday; its training week runs Monday 2026-11-23 to Sunday 2026-11-29.
const TODAY = '2026-11-25'

const cycle = (over: Partial<Cycle>): Cycle => ({
  id: 'c1',
  exercise: 'deadlift',
  program: '5-x-5',
  started: '2026-11-02',
  oldBest: 60,
  scores: [null, null, null, null, null, null],
  add: 0,
  done: false,
  finished: null,
  newBest: null,
  ...over,
})
const user = (cycles: Cycle[], sessions: User['sessions'] = []): User => ({ id: 'u', name: 'U', cycles, sessions })

describe('exercise feed', () => {
  it('plans the weeks still to do as Monday-Sunday events from this week on', () => {
    const { events } = exerciseFeed(user([cycle({ scores: [59.5, 61, null, null, null, null], scored: ['2026-11-10', '2026-11-17', null, null, null, null] })]), ref, TODAY)
    const planned = events.filter((e) => e.status === 'planned')
    expect(planned.map((e) => [e.start, e.end])).toEqual([
      ['2026-11-23', '2026-11-30'],
      ['2026-11-30', '2026-12-07'],
      ['2026-12-07', '2026-12-14'],
      ['2026-12-14', '2026-12-21'],
    ])
    // This week carries the proposal as loaded, like the training card (62.5 kg in the sheets).
    expect(planned[0].title).toBe('Deadlift 5 x 5 · 62.5 kg')
    const done = events.filter((e) => e.status === 'done')
    expect(done.map((e) => [e.title, e.start, e.end])).toEqual([
      ['Deadlift 59.5 kg', '2026-11-10', '2026-11-11'],
      ['Deadlift 61 kg', '2026-11-17', '2026-11-18'],
    ])
  })

  it('starts the plan next week when the cycle already had an entry this week', () => {
    const { events } = exerciseFeed(user([cycle({ scores: [59.5, null, null, null, null, null], scored: ['2026-11-24', null, null, null, null, null] })]), ref, TODAY)
    expect(events.find((e) => e.status === 'planned')?.start).toBe('2026-11-30')
  })

  it('shows undated history as one event over the cycle, and leaves out skipped weeks', () => {
    const c = cycle({ scores: [59.5, '-', 61, 62, 63, 66], done: true, started: '2025-01-06', finished: '2025-02-20', newBest: 66 })
    const { events } = exerciseFeed(user([c]), ref, TODAY)
    expect(events).toEqual([
      expect.objectContaining({ id: 'c1/cycle', title: 'Deadlift: 5 x 5', start: '2025-01-06', end: '2025-02-21', status: 'done', kind: 'cycle' }),
    ])
    expect(events[0].description).toContain('60 → 66 kg')
  })

  it('leaves out the undated results of an unfinished cycle', () => {
    const { events } = exerciseFeed(user([cycle({ started: '2021-11-09', scores: [59.5, 61, null, null, null, null] })]), ref, TODAY)
    expect(events.every((e) => e.status === 'planned' && e.start >= '2026-11-23')).toBe(true)
  })

  it('gives timed workouts their times, and finds them by their day in Helsinki', () => {
    const span = { start: '2026-11-24T21:40:00.000Z', end: '2026-11-24T22:05:00.000Z' } // 23:40-00:05 in Helsinki
    const c = cycle({ scores: [59.5, null, null, null, null, null], scored: ['2026-11-25', null, null, null, null, null], timed: [span, null, null, null, null, null] })
    const session = { ...example.sessions![0], date: '2026-11-25', span }
    const { events } = exerciseFeed(user([c], [session]), ref, TODAY, '2026-11-25', '2026-11-26')
    const done = events.filter((e) => e.status === 'done')
    expect(done.map((e) => [e.title, e.allDay, e.start, e.end])).toEqual([
      ['Deadlift 59.5 kg', false, span.start, span.end],
      ['Body weight, Day 1', false, span.start, span.end],
    ])
    // It began on the 24th in Helsinki, so a range of the 24th alone finds it too.
    expect(exerciseFeed(user([c], [session]), ref, TODAY, '2026-11-24', '2026-11-25').events.filter((e) => e.status === 'done')).toHaveLength(2)
    expect(exerciseFeed(user([c], [session]), ref, TODAY, '2026-11-26', '2026-11-27').events.filter((e) => e.status === 'done')).toHaveLength(0)
  })

  it('lists sessions with the exercises performed', () => {
    const [e] = exerciseFeed(user([], example.sessions!.slice(0, 1)), ref, TODAY).events
    expect(e).toMatchObject({ title: 'Body weight, Day 1', start: '2026-09-07', end: '2026-09-08', kind: 'bodyweight', status: 'done' })
    expect(e.description).toBe('Plank, Lunge 42, Push Up 27, Star Jump 66')
  })

  it('returns only events overlapping the range, with ids unique', () => {
    const all = exerciseFeed(example, ref, TODAY).events
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length)
    const from = '2026-09-01'
    const to = addDays(from, 7)
    const some = exerciseFeed(example, ref, TODAY, from, to).events
    expect(some.length).toBeGreaterThan(0)
    expect(some.length).toBeLessThan(all.length)
    for (const e of some) expect(e.start < to && e.end > from).toBe(true)
  })
})
