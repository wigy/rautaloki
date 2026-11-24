// The exercise feed: a user's training as calendar events, for planner's Exercises calendar.
//
// All events are all-day, since only dates are stored:
// - a lift result with its entry date: a day event, done
// - lift results without a date (history imported from the sheets): one event over a
//   finished cycle, from its start to its finish, done; an unfinished cycle's undated
//   results are left out, as it may have started years ago
// - the weeks of an unfinished cycle still to do: one Monday-Sunday event per program
//   week, this week first (next week if the cycle already had an entry this week), planned.
//   This week shows the proposal as loaded; later weeks the plan corrected by the best
//   performance so far, which is what the proposal will be if that holds; TEST no weight
// - a body weight or stretching session: a day event, done
// Skipped weeks ("-") are left out.

import { bwDay, bwExercise } from './bodyweight.ts'
import { stretch, routine } from './stretching.ts'
import { bestPerformance, currentWeek, doneThisWeek, isTestWeek, plan, roundHalf, target, weekStart } from './training.ts'
import type { Cycle, Reference, User } from './types.ts'

export interface FeedEvent {
  /** Stable across fetches. */
  id: string
  title: string
  /** YYYY-MM-DD, the first day. */
  start: string
  /** YYYY-MM-DD, the day after the last one (exclusive, as in iCalendar). */
  end: string
  status: 'done' | 'planned'
  kind: 'lift' | 'cycle' | 'bodyweight' | 'stretch'
  description: string
}

export interface Feed {
  name: string
  events: FeedEvent[]
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const kg = (n: number) => `${n} kg`

function cycleEvents(cycle: Cycle, ref: Reference, today: string): FeedEvent[] {
  const program = ref.programs.find((p) => p.id === cycle.program)
  const exercise = ref.catalog.find((e) => e.id === cycle.exercise)
  if (!program) return []
  const name = exercise?.name ?? cycle.exercise
  const weeks = program.weeks.length
  const out: FeedEvent[] = []
  let undated = false

  cycle.scores.forEach((score, w) => {
    if (score === null || score === '-') return
    const date = cycle.scored?.[w]
    if (!date) {
      undated = true
      return
    }
    const scheme = program.weeks[w]?.scheme ?? ''
    out.push({
      id: `${cycle.id}/${w}`,
      title: `${name} ${isTestWeek(program, w) ? 'test ' : ''}${kg(score)}`,
      start: date,
      end: addDays(date, 1),
      status: 'done',
      kind: 'lift',
      description: `${program.name}, week ${w + 1}/${weeks}: ${scheme}`,
    })
  })

  if (undated && cycle.done && cycle.started) {
    const last = cycle.finished ?? cycle.started
    const best = cycle.newBest === null ? '' : `, best ${cycle.oldBest ?? '?'} → ${kg(cycle.newBest)}`
    out.push({
      id: `${cycle.id}/cycle`,
      title: `${name}: ${program.name}`,
      start: cycle.started,
      end: addDays(last < cycle.started ? cycle.started : last, 1),
      status: 'done',
      kind: 'cycle',
      description: `Cycle${best}`,
    })
  }

  const next = cycle.done ? -1 : currentWeek(cycle)
  if (next >= 0) {
    const first = addDays(weekStart(today), doneThisWeek(cycle, today) ? 7 : 0)
    const now = exercise ? plan(cycle, program, exercise, ref.weights) : null
    for (let w = next; w < weeks; w++) {
      const monday = addDays(first, 7 * (w - next))
      const scheme = program.weeks[w].scheme
      const t = target(cycle, program, w)
      const load = isTestWeek(program, w)
        ? null
        : w === next
          ? (now?.load?.total ?? now?.proposal ?? null)
          : t === null
            ? null
            : roundHalf(t * bestPerformance(cycle, program) + cycle.add)
      const plates = w === next && now?.plates ? `, ${now.plates}` : ''
      out.push({
        id: `${cycle.id}/${w}`,
        title: `${name} ${scheme}${load === null ? '' : ` · ${kg(load)}`}`,
        start: monday,
        end: addDays(monday, 7),
        status: 'planned',
        kind: 'lift',
        description:
          `${program.name}, week ${w + 1}/${weeks}` +
          (load === null ? '' : `: ${w === next ? '' : 'about '}${kg(load)}${plates}`),
      })
    }
  }
  return out
}

function sessionEvents(user: User): FeedEvent[] {
  return (user.sessions ?? []).map((s) => {
    const bw = s.kind === 'bodyweight'
    const title = bw ? `Body weight, ${bwDay(s.plan)?.name ?? s.plan}` : (routine(s.plan)?.name ?? s.plan)
    const what = s.exercises
      .map((p) => {
        const name = bw ? bwExercise(p.id).name : stretch(p.id).name
        return p.reps === null ? name : `${name} ${p.reps}`
      })
      .join(', ')
    return {
      id: `session/${s.id}`,
      title,
      start: s.date,
      end: addDays(s.date, 1),
      status: 'done' as const,
      kind: s.kind,
      description: what,
    }
  })
}

/** The user's events overlapping [from, to) (YYYY-MM-DD, either open), by start date. */
export function exerciseFeed(user: User, ref: Reference, today: string, from?: string, to?: string): Feed {
  const events = [...user.cycles.flatMap((c) => cycleEvents(c, ref, today)), ...sessionEvents(user)]
    .filter((e) => (!to || e.start < to) && (!from || e.end > from))
    .sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id))
  return { name: 'Exercises', events }
}
