import { useEffect, useRef, useState } from 'react'

function getInitial(email) {
  if (!email) return '?'
  const trimmed = email.trim()
  return trimmed ? trimmed[0].toUpperCase() : '?'
}

export default function UserMenu({ email, theme, onToggleTheme, onSignOut, onOpenProfile }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="user-menu" ref={wrapRef}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title={email || 'Account'}
      >
        <span className="user-menu__avatar" aria-hidden>
          {getInitial(email)}
        </span>
      </button>
      {open ? (
        <div className="user-menu__panel" role="menu">
          <p className="user-menu__email" title={email}>
            {email || 'Signed in'}
          </p>
          {onOpenProfile ? (
            <button
              type="button"
              role="menuitem"
              className="user-menu__item"
              onClick={() => {
                setOpen(false)
                onOpenProfile()
              }}
            >
              Profile
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="user-menu__item"
            onClick={() => {
              onToggleTheme?.()
            }}
          >
            <span>Theme</span>
            <span className="user-menu__hint">{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="user-menu__item user-menu__item--danger"
            onClick={() => {
              setOpen(false)
              onSignOut?.()
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}
