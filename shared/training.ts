// Training rules, ported from the formulas of the original "Weight Training" sheets
// (Calculations sheet). Pure functions shared by the UI and the tests.

import type { Cycle, EquipmentKind, Exercise, Load, Program, User, WeightKind, Weights } from './types.ts'

/** Sheets' MROUND(x, 0.5). */
export function roundHalf(x: number): number {
  return Math.round(x * 2) / 2
}

/** Index of the week to do next, or -1 when every week has a score. */
export function currentWeek(cycle: Cycle): number {
  return cycle.scores.findIndex((s) => s === null)
}

export function isTestWeek(program: Program, week: number): boolean {
  return program.weeks[week]?.scheme.toUpperCase() === 'TEST'
}

/** Planned weight for a week: the old best scaled by the program's percentage. */
export function target(cycle: Cycle, program: Program, week: number): number | null {
  const pct = program.weeks[week]?.pct
  if (cycle.oldBest === null || pct === undefined) return null
  return roundHalf(cycle.oldBest * pct)
}

/** Lifted weight relative to the plan, for every week that has a score. */
export function performance(cycle: Cycle, program: Program): (number | null)[] {
  return cycle.scores.map((s, w) => {
    const t = target(cycle, program, w)
    return typeof s === 'number' && t ? s / t : null
  })
}

/** Best ratio so far, 1 when there is nothing to go on yet. */
export function bestPerformance(cycle: Cycle, program: Program): number {
  const ratios = performance(cycle, program).filter((r): r is number => r !== null && r > 0)
  return ratios.length ? Math.max(...ratios) : 1
}

/**
 * Proposed weight for the current week: the plan corrected by how far ahead of
 * (or behind) the plan this cycle has been at its best, plus the manual adjustment.
 */
export function proposal(cycle: Cycle, program: Program): number | null {
  const week = currentWeek(cycle)
  const t = week < 0 ? null : target(cycle, program, week)
  if (t === null) return null
  return roundHalf(t * bestPerformance(cycle, program) + cycle.add)
}

/** Same precedence as the sheet: Barbell, then a pair of dumbbells, then one, then other. */
export function equipmentKind(exercise: Exercise): EquipmentKind {
  const eq = exercise.equipment
  if (eq.includes('Barbell')) return 'barbell'
  if (eq.includes('Dumbbells')) return 'dumbbells'
  if (eq.includes('Dumbbell')) return 'dumbbell'
  return 'other'
}

/** Heaviest loadable weight not above `kg` (the sheet's approximate VLOOKUP). */
export function loadFor(kind: WeightKind, kg: number): Load | null {
  let best: Load | null = null
  for (const load of kind.loads) {
    if (load.total <= kg && (!best || load.total > best.total)) best = load
  }
  return best ?? kind.loads.reduce<Load | null>((a, b) => (!a || b.total < a.total ? b : a), null)
}

/** Plates to load in total, e.g. "4 × 1 kg, 4 × 2.25 kg". */
export function plateText(kind: WeightKind, load: Load): string {
  const parts = Object.entries(load.plates)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([plate, n]) => `${n * kind.multiple} × ${plate} kg`)
  return parts.length ? parts.join(', ') : 'no plates'
}

export interface Plan {
  week: number
  scheme: string
  isTest: boolean
  target: number | null
  proposal: number | null
  load: Load | null
  plates: string | null
}

export function plan(cycle: Cycle, program: Program, exercise: Exercise, weights: Weights): Plan | null {
  const week = currentWeek(cycle)
  if (week < 0) return null
  const kind = weights[equipmentKind(exercise)]
  const kg = proposal(cycle, program)
  const load = kg === null ? null : loadFor(kind, kg)
  return {
    week,
    scheme: program.weeks[week].scheme,
    isTest: isTestWeek(program, week),
    target: target(cycle, program, week),
    proposal: kg,
    load,
    plates: load ? plateText(kind, load) : null,
  }
}

/**
 * The manual adjustment that moves the shown load one loadable weight up (+1) or down (-1),
 * or null when there is none that way. A plain 0.5 kg step can land between two loadable
 * weights, or below the empty bar, and then changes nothing on screen.
 */
export function stepAdjust(cycle: Cycle, program: Program, kind: WeightKind, dir: 1 | -1): number | null {
  const week = currentWeek(cycle)
  const t = week < 0 ? null : target(cycle, program, week)
  const kg = proposal(cycle, program)
  if (t === null || kg === null) return null
  const totals = kind.loads.map((l) => l.total)
  if (!totals.length) return roundHalf(cycle.add + dir * 0.5)
  const shown = loadFor(kind, kg)?.total ?? kg
  const way = totals.filter((x) => (dir > 0 ? x > shown : x < shown))
  if (!way.length) return null
  const next = dir > 0 ? Math.min(...way) : Math.max(...way)
  // proposal() rounds t * best + add, so an add of next - round(t * best) lands exactly on next.
  return roundHalf(next - roundHalf(t * bestPerformance(cycle, program)))
}

/**
 * Record a week's result. A score on the test week, or the last week, closes the
 * cycle; the new best is the old one unless the test beat it.
 */
export function recordScore(cycle: Cycle, program: Program, score: number | '-', today: string): Cycle {
  const week = currentWeek(cycle)
  if (week < 0) throw new Error('cycle has no open week')
  const scores = cycle.scores.map((s, w) => (w === week ? score : s))
  const scored = cycle.scores.map((_, w) => (w === week ? today : (cycle.scored?.[w] ?? null)))
  const next: Cycle = { ...cycle, scores, scored }
  if (isTestWeek(program, week) || week === scores.length - 1) {
    const old = cycle.oldBest ?? 0
    next.newBest = isTestWeek(program, week) && typeof score === 'number' ? Math.max(old, score) : cycle.oldBest
    next.done = true
    next.finished = today
  }
  return next
}

/** Close a cycle whose weeks are all recorded but which was never closed (old sheet data). */
export function finishCycle(cycle: Cycle, program: Program, today: string): Cycle {
  const t = program.weeks.findIndex((w) => w.scheme.toUpperCase() === 'TEST')
  const test = cycle.scores[t]
  const newBest = typeof test === 'number' ? Math.max(cycle.oldBest ?? 0, test) : cycle.oldBest
  return { ...cycle, done: true, finished: cycle.finished ?? today, newBest }
}

/** Clear the most recent score, reopening the cycle if it had closed. */
export function undoScore(cycle: Cycle): Cycle {
  const week = currentWeek(cycle)
  const last = (week < 0 ? cycle.scores.length : week) - 1
  if (last < 0) return cycle
  const scores = cycle.scores.map((s, w) => (w === last ? null : s))
  const scored = cycle.scored?.map((d, w) => (w === last ? null : d))
  return { ...cycle, scores, ...(scored && { scored }), done: false, finished: null, newBest: null }
}

export function newCycle(exercise: string, program: Program, oldBest: number | null, today: string): Cycle {
  return {
    id: `${today}-${exercise}-${Date.now().toString(36)}`,
    exercise,
    program: program.id,
    started: today,
    oldBest,
    scores: program.weeks.map(() => null),
    scored: program.weeks.map(() => null),
    add: 0,
    done: false,
    finished: null,
    newBest: null,
  }
}

export interface Record_ {
  best: number
  date: string | null
}

/** Best weight per exercise across all cycles, with the date it was reached. */
export function records(user: User): Map<string, Record_> {
  const out = new Map<string, Record_>()
  const consider = (exercise: string, kg: number | null, date: string | null) => {
    if (kg === null) return
    const cur = out.get(exercise)
    if (!cur || kg > cur.best) out.set(exercise, { best: kg, date })
  }
  for (const c of user.cycles) {
    consider(c.exercise, c.oldBest, c.started)
    consider(c.exercise, c.newBest, c.finished)
  }
  return out
}

/** Relative gain of a finished cycle, e.g. 0.08 for +8 %. */
export function improvement(cycle: Cycle): number | null {
  if (!cycle.done || !cycle.oldBest || cycle.newBest === null) return null
  return (cycle.newBest - cycle.oldBest) / cycle.oldBest
}

/** Dates and training weeks are reckoned in this zone, whatever the device's own setting. */
export const TIME_ZONE = 'Europe/Helsinki'

// en-CA formats a date as YYYY-MM-DD.
const DATE_IN_ZONE = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** The date in TIME_ZONE as YYYY-MM-DD. */
export function today(now: Date = new Date()): string {
  return DATE_IN_ZONE.format(now)
}

/** Monday of the training week (Monday 00:00 to Sunday 24:00) a YYYY-MM-DD date falls in. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

/** Whether the cycle's latest entry, a result or a skip, was made in the same week as `today`. */
export function doneThisWeek(cycle: Cycle, today: string): boolean {
  const dates = (cycle.scored ?? []).filter((d): d is string => d !== null)
  if (!dates.length) return false
  const last = dates.reduce((a, b) => (b > a ? b : a))
  return weekStart(last) === weekStart(today)
}
