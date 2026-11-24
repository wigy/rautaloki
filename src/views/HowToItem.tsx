/** One exercise or stretch in a how-to panel: its picture beside the steps and what to watch. */
export function HowToItem({ name, icon, steps, watch }: { name: string; icon?: string; steps: string[]; watch: string[] }) {
  return (
    <div className="howto-item">
      {icon && <img className="howto-art" src={icon} alt="" loading="lazy" />}
      <div>
        <h3>{name}</h3>
        <ol>
          {steps.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
        <ul>
          {watch.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** A row of an exercise list on a card: small picture, name, and a muted note. */
export function ListItem({ name, icon, note }: { name: string; icon?: string; note?: string }) {
  return (
    <li>
      {icon ? <img className="list-art" src={icon} alt="" loading="lazy" /> : <span className="list-art" />}
      <span>
        {name}
        {note && <span className="muted small"> {note}</span>}
      </span>
    </li>
  )
}
