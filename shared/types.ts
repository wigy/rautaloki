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

/** One run of a program on one exercise. */
export interface Cycle {
  id: string
  exercise: string
  program: string
  started: string | null
  oldBest: number | null
  /** One entry per program week. */
  scores: Score[]
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
}

export interface Reference {
  catalog: Exercise[]
  programs: Program[]
  weights: Weights
  users: { id: string; name: string }[]
}
