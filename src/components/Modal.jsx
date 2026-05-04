import { useEffect, useRef } from 'react'

export default function Modal({ open, onClose, title, children, labelledBy }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const previouslyFocused = document.activeElement
    const firstFocusable = dialogRef.current?.querySelector(
      'input, button, textarea, select, [tabindex]:not([tabindex="-1"])',
    )
    firstFocusable?.focus?.()
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [open, onClose])

  if (!open) return null

  const titleId = labelledBy ?? 'modal-title'

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => onClose?.()}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <header className="modal__header">
            <h2 id={titleId} className="modal__title">
              {title}
            </h2>
            <button
              type="button"
              className="modal__close"
              aria-label="Close dialog"
              onClick={() => onClose?.()}
            >
              ×
            </button>
          </header>
        ) : null}
        <div className="modal__body">{children}</div>
      </div>
    </div>
  )
}
