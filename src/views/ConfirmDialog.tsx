import { useEffect, useRef } from 'react'

export interface ConfirmRequest {
  title: string
  message: string
  /** Label of the confirming button, e.g. "Delete". */
  action: string
  /** Colour of the confirming button: amber for a reversible step, red for a loss. */
  tone: 'warn' | 'danger'
  icon?: string
  onConfirm: () => void
}

interface Props {
  request: ConfirmRequest | null
  onClose: () => void
}

/** A modal yes/no question in place of window.confirm. Escape and a tap outside cancel. */
export function ConfirmDialog({ request, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (request && !d.open) d.showModal()
    if (!request && d.open) d.close()
  }, [request])

  return (
    <dialog
      ref={ref}
      className="confirm"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {request && (
        <div className="confirm-body">
          {request.icon && <img className="confirm-icon" src={request.icon} alt="" />}
          <h3>{request.title}</h3>
          <p>{request.message}</p>
          <div className="confirm-actions">
            <button type="button" onClick={onClose} autoFocus>
              Cancel
            </button>
            <button
              type="button"
              className={`confirm-go ${request.tone}`}
              onClick={() => {
                request.onConfirm()
                onClose()
              }}
            >
              {request.action}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
