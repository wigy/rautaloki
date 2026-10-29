import type { Exercise, Program, Reference } from '../shared/types.ts'

const cache = new WeakMap<Reference, { ex: Map<string, Exercise>; prog: Map<string, Program> }>()

function maps(data: Reference) {
  let m = cache.get(data)
  if (!m) {
    m = {
      ex: new Map(data.catalog.map((e) => [e.id, e])),
      prog: new Map(data.programs.map((p) => [p.id, p])),
    }
    cache.set(data, m)
  }
  return m
}

/** Exercises missing from the catalog still get a usable stand-in. */
export function exercise(data: Reference, id: string): Exercise {
  return (
    maps(data).ex.get(id) ?? { id, name: id, mainMuscle: '?', otherMuscles: [], equipment: [], level: null, url: null }
  )
}

export function program(data: Reference, id: string): Program | undefined {
  return maps(data).prog.get(id)
}

export function kg(n: number | null | undefined): string {
  return n === null || n === undefined ? '–' : `${n} kg`
}

export function fmtDate(d: string | null): string {
  if (!d) return '–'
  const [y, m, day] = d.split('-').map(Number)
  return `${day}.${m}.${y}`
}
