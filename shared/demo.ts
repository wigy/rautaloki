// The demo user: the made-up example user of fixtures/, brought up to date.
//
// "Try the demo" on the login screen resets it every time, so anyone (Google Play's
// reviewers included) can try everything without a Google account and without harm.
// Its dates are moved by whole weeks so that its latest entry falls in last week: the
// history then looks recent, weekdays stay the same, and this week's lifts are still to do.

import { addDays } from './feed.ts'
import { weekStart } from './training.ts'
import type { User } from './types.ts'

export const DEMO_ID = 'demo'
export const DEMO_NAME = 'Demo'

const DATE = /^(\d{4}-\d{2}-\d{2})(T[\d:.]+Z)?$/

/** Every date and ISO instant anywhere in a JSON value, moved by `days`. */
export function shiftDates<T>(value: T, days: number): T {
  return JSON.parse(JSON.stringify(value), (_, v) => {
    const m = typeof v === 'string' ? DATE.exec(v) : null
    if (!m) return v
    if (!m[2]) return addDays(m[1], days)
    return new Date(Date.parse(v) + days * 86_400_000).toISOString()
  })
}

/** The latest date in a JSON value, or null if it has none. */
function latest(value: unknown): string | null {
  let max: string | null = null
  JSON.stringify(value, (_, v) => {
    const m = typeof v === 'string' ? DATE.exec(v) : null
    if (m && (!max || m[1] > max)) max = m[1]
    return v
  })
  return max
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

/** The demo user made from the template, with its latest entry moved into last week. */
export function demoUser(template: User, today: string): User {
  const last = latest(template)
  let days = 0
  if (last) {
    const lastWeek = addDays(weekStart(today), -7)
    days = 7 * Math.round(daysBetween(last, lastWeek) / 7)
    // Same weekday as before, inside last week: never this week, never two weeks back.
    while (addDays(last, days) >= weekStart(today)) days -= 7
    while (addDays(last, days) < lastWeek) days += 7
  }
  return { ...shiftDates(template, days), id: DEMO_ID, name: DEMO_NAME }
}
