import { describe, expect, it } from 'vitest'
import { liftCues, parseScheme, timerPlan } from './timer.ts'

// Cue offsets as in time2xercise's data/fitness.js (sounds of the WL-*-DO codes).
const t2x = (cues: Record<number, string>) => Object.entries(cues).map(([at, say]) => ({ at: Number(at), say }))

describe('timer', () => {
  it('parses the schemes in use', () => {
    expect(parseScheme('10 x 10')).toEqual({ sets: 10, reps: 10, fast: false })
    expect(parseScheme('2 x 6 fast')).toEqual({ sets: 2, reps: 6, fast: true })
    expect(parseScheme('2 x MAX')).toEqual({ sets: 2, reps: null, fast: false })
    expect(parseScheme('TEST')).toEqual({ sets: 1, reps: null, fast: false })
    expect(parseScheme('rest day')).toBeNull()
  })

  it('calls repeats like time2xercise', () => {
    const [ready, lift, rest] = timerPlan('10 x 10')!
    expect(ready).toMatchObject({ kind: 'ready', duration: 15 })
    expect(ready.cues).toContainEqual({ at: 9, say: 'first round' })
    expect(lift).toMatchObject({ kind: 'lift', duration: 50 })
    expect(lift.cues).toEqual(
      t2x({
        0: 'lift',
        5: 'lift',
        10: 'lift',
        15: 'lift',
        20: 'lift',
        25: 'lift',
        30: 'lift',
        35: '3',
        40: '2',
        45: '1',
      }),
    )
    expect(rest).toMatchObject({ kind: 'rest', duration: 60, set: 2 })
    expect(rest.cues).toEqual(t2x({ 0: 'relax', 54: 'second round' }))
    expect(timerPlan('10 x 10')!.at(-2)!.cues.at(-1)).toEqual({ at: 54, say: 'last round' })

    expect(liftCues(5, 5)).toEqual(t2x({ 0: 'lift', 5: 'lift', 10: '3', 15: '2', 20: '1' }))
    expect(liftCues(7, 5)).toEqual(t2x({ 0: 'lift', 5: 'lift', 10: 'lift', 15: 'lift', 20: '3', 25: '2', 30: '1' }))
    expect(liftCues(2, 7)).toEqual(t2x({ 0: 'lift', 7: 'lift' }))
    expect(liftCues(1, 5)).toEqual(t2x({ 0: 'lift' }))
  })

  it('uses the time2xercise set lengths and rests', () => {
    const shape = (s: string) => {
      const p = timerPlan(s)!
      return [p.find((x) => x.kind === 'lift')!.duration, p.find((x) => x.kind === 'rest')?.duration]
    }
    expect(shape('4 x 10')).toEqual([50, 120])
    expect(shape('5 x 5')).toEqual([25, 120])
    expect(shape('3 x 7')).toEqual([35, 120])
    expect(shape('4 x 8')).toEqual([40, 120])
    expect(shape('4 x 2')).toEqual([14, 120])
    expect(shape('6 x 1')).toEqual([5, 180])
    expect(shape('2 x 6 fast')).toEqual([18, 120])
  })

  it('scales the repeats by the tempo', () => {
    const lift = timerPlan('3 x 4', 0.5)!.find((s) => s.kind === 'lift')!
    expect(lift).toMatchObject({ duration: 10, cadence: 2.5 })
    expect(lift.cues.map((c) => c.at)).toEqual([0, 2.5, 5, 7.5])
    expect(timerPlan('3 x 4', 0.5)!.find((s) => s.kind === 'rest')!.duration).toBe(120)
    expect(timerPlan('2 x 6 fast', 0.7)!.find((s) => s.kind === 'lift')!.cadence).toBe(2.1)
  })

  it('leaves MAX sets open', () => {
    const p = timerPlan('2 x MAX')!
    expect(p.map((s) => [s.kind, s.duration])).toEqual([
      ['ready', 15],
      ['lift', null],
      ['rest', 180],
      ['lift', null],
    ])
    expect(timerPlan('TEST')![0].cues).toContainEqual({ at: 9, say: 'get ready' })
  })
})
