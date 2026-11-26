import type { Ctx } from '../App.tsx'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function Settings({ user, update }: Ctx) {
  const rest = user.restDays ?? []
  const toggle = (day: number) =>
    update((u) => {
      const now = u.restDays ?? []
      const next = now.includes(day) ? now.filter((d) => d !== day) : [...now, day].sort((a, b) => a - b)
      return { ...u, restDays: next }
    })

  return (
    <section className="card">
      <h2>Resting days</h2>
      <p className="muted small">
        No body weight training is put in the calendar on these days. On other days, once you have done body weight in
        the past week, the next day to do is planned for today.
      </p>
      <ul className="toggles">
        {DAYS.map((name, i) => (
          <li key={name}>
            <label className="toggle">
              <span>{name}</span>
              <input
                type="checkbox"
                role="switch"
                checked={rest.includes(i)}
                onChange={() => toggle(i)}
              />
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
