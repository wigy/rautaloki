// Spoken set timer. The timings follow the weight lifting schedules of the old
// time2xercise timer: a 15 s get-ready, then each set as one "lift" call per repeat
// with the last three repeats counted down "3", "2", "1", "relax" when the set ends,
// and the next round announced 6 s before a rest ends.

/** Something to say, `at` seconds from the start of its segment. */
export interface Cue {
  at: number
  say: string
}

export interface Segment {
  kind: 'ready' | 'lift' | 'rest'
  /** The set this segment leads to or is, counted from 1. */
  set: number
  sets: number
  /** Seconds, or null for a MAX set that runs until the lifter says it is done. */
  duration: number | null
  /** Seconds per repeat in a lift, 0 for MAX. */
  cadence: number
  cues: Cue[]
}

export interface Scheme {
  sets: number
  /** Repeats per set, null for MAX. */
  reps: number | null
  fast: boolean
}

const READY = 15
const ROUND_CALL = 6
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']

/** "10 x 10", "2 x 6 fast", "2 x MAX"; "TEST" is one MAX set. Null if not a set scheme. */
export function parseScheme(scheme: string): Scheme | null {
  const s = scheme.trim().toLowerCase()
  if (s === 'test') return { sets: 1, reps: null, fast: false }
  const m = /^(\d+)\s*x\s*(\d+|max)(\s+fast)?$/.exec(s)
  if (!m) return null
  const sets = Number(m[1])
  const reps = m[2] === 'max' ? null : Number(m[2])
  if (sets < 1 || reps === 0) return null
  return { sets, reps, fast: !!m[3] }
}

/** Seconds per repeat: 5 s, 3 s when fast, and 7 s for doubles (time2xercise's 4 x 2). */
export function cadence({ reps, fast }: Scheme): number {
  if (reps === null) return 0
  return fast ? 3 : reps === 2 ? 7 : 5
}

/** Rest between sets: 1 min in 10-set work, 3 min for singles and MAX, otherwise 2 min. */
export function restSeconds({ sets, reps }: Scheme): number {
  if (reps === null || reps === 1) return 180
  return sets >= 10 ? 60 : 120
}

function roundCall(set: number, sets: number): string {
  if (sets === 1) return 'get ready'
  if (set === sets) return 'last round'
  return set <= ORDINALS.length ? `${ORDINALS[set - 1]} round` : `round ${set}`
}

/** Lift cues of one set: "lift" per repeat, the last three counted down when there are more than three. */
export function liftCues(reps: number | null, every: number): Cue[] {
  if (reps === null) return [{ at: 0, say: 'lift' }]
  return Array.from({ length: reps }, (_, i) => ({
    at: i * every,
    say: reps > 3 && i >= reps - 3 ? String(reps - i) : 'lift',
  }))
}

/** Range of the per-exercise tempo factor. */
export const TEMPO_MIN = 0.3
export const TEMPO_MAX = 2

/**
 * The whole timed session for a scheme, or null when the scheme is not one to time.
 * `tempo` scales the seconds per repeat, so 0.5 runs the repeats twice as fast.
 */
export function timerPlan(scheme: string, tempo = 1): Segment[] | null {
  const sc = parseScheme(scheme)
  if (!sc) return null
  const every = Math.round(cadence(sc) * tempo * 100) / 100
  const rest = restSeconds(sc)
  const { sets } = sc
  const out: Segment[] = [
    {
      kind: 'ready',
      set: 1,
      sets,
      duration: READY,
      cadence: 0,
      cues: [
        { at: 0, say: 'get ready' },
        { at: READY - ROUND_CALL, say: roundCall(1, sets) },
      ],
    },
  ]
  for (let set = 1; set <= sets; set++) {
    if (set > 1) {
      out.push({
        kind: 'rest',
        set,
        sets,
        duration: rest,
        cadence: 0,
        cues: [
          { at: 0, say: 'relax' },
          { at: rest - ROUND_CALL, say: roundCall(set, sets) },
        ],
      })
    }
    out.push({
      kind: 'lift',
      set,
      sets,
      duration: sc.reps === null ? null : sc.reps * every,
      cadence: every,
      cues: liftCues(sc.reps, every),
    })
  }
  return out
}
