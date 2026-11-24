import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEMO_ID, demoUser, shiftDates } from './demo.ts'
import { weekStart } from './training.ts'
import type { User } from './types.ts'

const example: User = JSON.parse(readFileSync(new URL('../fixtures/users/example.json', import.meta.url), 'utf8'))

describe('demo user', () => {
  it('moves dates and instants, and nothing else', () => {
    const v = { a: '2026-09-07', b: '2026-09-07T15:00:00.000Z', id: '2026-09-07-bw-day-1', n: 3, c: [null, '2026-09-08'] }
    expect(shiftDates(v, 14)).toEqual({ a: '2026-09-21', b: '2026-09-21T15:00:00.000Z', id: '2026-09-07-bw-day-1', n: 3, c: [null, '2026-09-22'] })
  })

  it('puts the latest entry in last week, on the same weekday, whatever today is', () => {
    for (const today of ['2026-11-24', '2026-11-29', '2026-11-30', '2027-03-04']) {
      const demo = demoUser(example, today)
      expect(demo).toMatchObject({ id: DEMO_ID, name: 'Demo' })
      const dates = demo.sessions!.map((s) => s.date).sort()
      const last = dates[dates.length - 1]
      const monday = weekStart(today)
      expect(last < monday).toBe(true)
      expect(weekStart(last)).toBe(new Date(Date.parse(monday) - 7 * 86_400_000).toISOString().slice(0, 10))
      expect(new Date(last).getUTCDay()).toBe(new Date('2026-09-14').getUTCDay())
      expect(demo.cycles.length).toBe(example.cycles.length)
    }
  })
})
