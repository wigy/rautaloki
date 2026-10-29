import { useMemo, useState } from 'react'
import type { Exercise } from '../../shared/types.ts'
import { exerciseIcon, muscleIcon } from '../icons.ts'

interface Props {
  catalog: Exercise[]
  value: string
  onChange: (id: string) => void
  /** Short note under an exercise name, e.g. its current best. */
  note: (id: string) => string | undefined
  active: Set<string>
}

/** Two steps: tap a main muscle group, then an exercise in it. */
export function ExercisePicker({ catalog, value, onChange, note, active }: Props) {
  const groups = useMemo(() => {
    const m = new Map<string, Exercise[]>()
    for (const e of catalog) m.set(e.mainMuscle, [...(m.get(e.mainMuscle) ?? []), e])
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [catalog])
  const selected = catalog.find((e) => e.id === value)
  const [muscle, setMuscle] = useState<string | null>(selected?.mainMuscle ?? null)

  if (selected) {
    return (
      <div className="picked">
        <Tile src={exerciseIcon(selected.id)} label={selected.name} />
        <div>
          <strong>{selected.name}</strong>
          <div className="muted small">{selected.mainMuscle}</div>
          {note(selected.id) && <div className="muted small">{note(selected.id)}</div>}
        </div>
        <button type="button" className="link" onClick={() => onChange('')}>
          Change
        </button>
      </div>
    )
  }

  const list = groups.find(([m]) => m === muscle)?.[1]
  if (!list) {
    return (
      <>
        <div className="picker-title">Muscle group</div>
        <ul className="tiles">
          {groups.map(([m, exs]) => (
            <li key={m}>
              <button type="button" onClick={() => setMuscle(m)}>
                <Tile src={muscleIcon(m)} label={m} />
                <span className="tile-name">{m}</span>
                <span className="muted small">{exs.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <>
      <div className="picker-title">
        <button type="button" className="link" onClick={() => setMuscle(null)}>
          ‹ Muscle groups
        </button>
        <span>{muscle}</span>
      </div>
      <ul className="tiles">
        {list.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => onChange(e.id)}>
              <Tile src={exerciseIcon(e.id)} label={e.name} />
              <span className="tile-name">{e.name}</span>
              {note(e.id) && <span className="muted small">{note(e.id)}</span>}
              {active.has(e.id) && <span className="badge">in progress</span>}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

/** The picture, or the label's initials on a plain tile when there is none. */
function Tile({ src, label }: { src?: string; label: string }) {
  if (src) return <img className="tile-art" src={src} alt="" loading="lazy" />
  const initials = label
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
  return (
    <span className="tile-art" aria-hidden>
      {initials}
    </span>
  )
}
