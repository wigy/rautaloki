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

  describe('body weight due today', () => {
    const bw = (date: string, plan = 'bw-day-1') => ({ id: `${date}-${plan}`, kind: 'bodyweight' as const, plan, date, seconds: 40, exercises: [] })
    const due = (u: User) => exerciseFeed(u, ref, TODAY).events.filter((e) => e.id.startsWith('due/'))

    it('plans the first day not done this week, at the last level, after body weight in the past week', () => {
      expect(due(user([], [bw('2026-11-23')]))).toEqual([
        expect.objectContaining({ title: 'Body weight, Day 2', start: TODAY, end: '2026-11-26', allDay: true, status: 'planned', kind: 'bodyweight' }),
      ])
      expect(due(user([], [bw('2026-11-23')]))[0].description).toMatch(/^Level 40:20: /)
    })

    it('counts the 7 days before today, from last week too', () => {
      expect(due(user([], [bw('2026-11-18')]))).toHaveLength(1)
      expect(due(user([], [bw('2026-11-17')]))).toHaveLength(0)
    })

    it('leaves it out on a rest day, when done today, and without recent body weight', () => {
      const recent = [bw('2026-11-23')]
      expect(due({ ...user([], recent), restDays: [2] })).toHaveLength(0) // Wednesday
      expect(due({ ...user([], recent), restDays: [0, 6] })).toHaveLength(1)
      expect(due(user([], [...recent, bw(TODAY, 'bw-day-2')]))).toHaveLength(0)
      expect(due(user([], []))).toHaveLength(0)
    })

    it('takes the day done longest ago once every day is done this week', () => {
      const all = ['bw-day-1', 'bw-day-2', 'bw-day-3', 'bw-day-4', 'bw-day-5']
      const sessions = [bw('2026-11-23', 'bw-day-3'), ...all.filter((d) => d !== 'bw-day-3').map((d) => bw('2026-11-24', d))]
      expect(due(user([], sessions))[0].title).toBe('Body weight, Day 3')
    })
  })

  describe('stretching due today', () => {
    const st = (date: string, plan: string) => ({ id: `${date}-${plan}`, kind: 'stretch' as const, plan, date, seconds: 45, exercises: [] })
    const due = (u: User, today = TODAY) => exerciseFeed(u, ref, today).events.filter((e) => e.id.startsWith('due/stretch/'))

    it('plans the routine done longest ago, after stretching in the past week', () => {
      const sessions = [st('2026-11-01', 'hips-back'), st('2026-11-10', 'warm-up'), st('2026-11-20', 'full-body')]
      expect(due(user([], sessions))).toEqual([
        expect.objectContaining({ title: 'Hips and back', start: TODAY, end: '2026-11-26', allDay: true, status: 'planned', kind: 'stretch' }),
      ])
      expect(due(user([], sessions))[0].description).toMatch(/^Hold 45 s: Kneeling hip flexor stretch, /)
    })

    it('counts the 7 days before today, rest days included', () => {
      expect(due(user([], [st('2026-11-18', 'warm-up')]))).toHaveLength(1)
      expect(due(user([], [st('2026-11-17', 'warm-up')]))).toHaveLength(0)
      expect(due({ ...user([], [st('2026-11-23', 'warm-up')]), restDays: [2] })).toHaveLength(1)
    })

    it('leaves it out when stretched today or without recent stretching', () => {
      expect(due(user([], [st('2026-11-23', 'warm-up'), st(TODAY, 'full-body')]))).toHaveLength(0)
      expect(due(user([], []))).toHaveLength(0)
    })

    it('picks among routines never done, the same all day but not every day', () => {
      const titles = new Set<string>()
      for (let d = 0; d < 30; d++) {
        const day = addDays('2026-11-24', d)
        const v = user([], [st(addDays(day, -1), 'warm-up')])
        const [e] = due(v, day)
        expect(['Full body', 'Hips and back']).toContain(e.title)
        expect(due(v, day)[0].title).toBe(e.title)
        titles.add(e.title)
      }
      expect(titles.size).toBe(2)
    })
  })
})
