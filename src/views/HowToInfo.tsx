import { type ReactNode, useEffect, useRef, useState } from 'react'

/**
 * An exercise picture with a small (i) on it. A tap opens the exercise's how-to in a
 * sheet over the timer; the timer keeps running underneath.
 */
export function InfoArt({ src, className, name, children }: { src: string; className: string; name: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      // Start at the top with the exercise name, not scrolled down to the focused Close.
      d.querySelector<HTMLElement>('.howto-sheet-body')?.focus({ preventScroll: true })
      d.scrollTop = 0
    }
    if (!open && d.open) d.close()
  }, [open])

  return (
    <>
      <button type="button" className="info-art" onClick={() => setOpen(true)} aria-label={`How to: ${name}`}>
        <img className={className} src={src} alt="" />
        <span className="info-badge" aria-hidden="true">
          i
        </span>
      </button>
      <dialog
        ref={ref}
        className="confirm howto-sheet"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false)
        }}
      >
        {open && (
          <div className="howto-sheet-body howto" tabIndex={-1}>
            {children}
            <button type="button" className="primary" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        )}
      </dialog>
    </>
  )
}
