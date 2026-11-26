// Data model of the JSON files under data/. See README.md for the file layout.

export interface Exercise {
  id: string
  name: string
  mainMuscle: string
  otherMuscles: string[]
  equipment: string[]
  level: string | null
  url: string | null
}

export interface ProgramWeek {
  /** What to do that week, e.g. "10 x 10", "2 x MAX" or "TEST". */
  scheme: string
  /** Target weight as a fraction of the cycle's old best. */
  pct: number
}

export interface Program {
  id: string
  name: string
  weeks: ProgramWeek[]
}

/** One loadable weight and the plates that make it, counted per side / per end. */
export interface Load {
  total: number
  plates: Record<string, number>
}

export interface WeightKind {
  /** Weight of the empty bar or handle. */
  base: number
  /** How many times each plate count is actually loaded (4 = pair of dumbbells). */
  multiple: number
  loads: Load[]
}

export type EquipmentKind = 'dumbbells' | 'dumbbell' | 'barbell' | 'other'
export type Weights = Record<EquipmentKind, WeightKind>

/** A score is the kg lifted that week, "-" for a skipped week, null for not yet done. */
export type Score = number | '-' | null

/** When a workout ran, as ISO instants (UTC). Recorded only for workouts done through a timer. */
export interface Span {
  start: string
  end: string
}

/** One run of a program on one exercise. */
export interface Cycle {
  id: string
  exercise: string
  program: string
  started: string | null
  oldBest: number | null
  /** One entry per program week. */
  scores: Score[]
  /** Date (YYYY-MM-DD) each week's score was entered, parallel to scores. Missing in older data. */
  scored?: (string | null)[]
  /** When each week's lifting ran, parallel to scores; null where not timed. Missing in older data. */
  timed?: (Span | null)[]
  /** Manual kg adjustment added to the proposed weight. */
  add: number
  done: boolean
  finished: string | null
  newBest: number | null
}

export interface User {
  id: string
  name: string
  cycles: Cycle[]
  /** Timer tempo by exercise id, a factor on the seconds per repeat: 0.5 is twice as fast. Missing is 1. */
  tempo?: Record<string, number>
  /** Body weight and stretching sessions, oldest first. Missing in older data. */
  sessions?: Session[]
  /** Days of the week without training, 0 = Monday … 6 = Sunday. Missing is none. */
  restDays?: number[]
}

/** One exercise of a session as performed. */
export interface Performed {
  /** Exercise id in shared/bodyweight.ts or stretch id in shared/stretching.ts. */
  id: string
  /** Repeats over all rounds, null when not counted (holds, stretches, not entered). */
  reps: number | null
}

/** One timed body weight or stretching session. */
export interface Session {
  id: string
  kind: 'bodyweight' | 'stretch'
  /** Body weight day or stretching routine id. */
  plan: string
  /** YYYY-MM-DD in TIME_ZONE. */
  date: string
  /** Work seconds per interval (body weight) or seconds per hold (static stretching). */
  seconds: number
  /** The exercises actually performed, in order. */
  exercises: Performed[]
  /** When the session ran, if it was done through the timer. */
  span?: Span
}

export interface Reference {
  catalog: Exercise[]
  programs: Program[]
  weights: Weights
}

/** The logged-in user, as the session reports it. */
export interface Me {
  id: string
  name: string
}
