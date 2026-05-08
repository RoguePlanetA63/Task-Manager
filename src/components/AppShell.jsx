import SegmentedNav from './SegmentedNav.jsx'
import UserMenu from './UserMenu.jsx'

export default function AppShell({
  email,
  displayName,
  theme,
  isGoogleConnected,
  onToggleTheme,
  onSignOut,
  onOpenProfile,
  navOptions,
  navValue,
  onNavChange,
  suppressSegmentedNav,
  mainWide,
  conn,
  aside,
  children,
}) {
  const connStatus = conn?.status ?? 'checking'
  const connMessage = conn?.message ?? ''
  const showError = connStatus === 'error'

  return (
    <div className="shell">
      <aside className="sidebar" role="banner">
        <div className="sidebar__brand">
          <span className="sidebar__logo" aria-hidden>
            ✓
          </span>
          <span className="sidebar__title">Task Manager</span>
        </div>

        {navOptions?.length && !suppressSegmentedNav ? (
          <nav className="sidebar__nav" aria-label="Primary">
            <SegmentedNav value={navValue} onChange={onNavChange} options={navOptions} />
          </nav>
        ) : null}

        <div className="sidebar__account">
          <UserMenu
            email={email}
            displayName={displayName}
            theme={theme}
            isGoogleConnected={isGoogleConnected}
            onToggleTheme={onToggleTheme}
            onSignOut={onSignOut}
            onOpenProfile={onOpenProfile}
          />
        </div>
      </aside>

      <main className={`shell__main${mainWide ? ' shell__main--wide' : ''}`}>
        {showError ? (
          <div className="conn-banner conn-banner--error" role="alert">
            <strong>Supabase connection error.</strong> {connMessage}
          </div>
        ) : null}
        <div className="shell__content">
          <div className="shell__body">{children}</div>
          {aside ? <aside className="shell__aside">{aside}</aside> : null}
        </div>
        <footer className="shell__footer">
          <div
            className={`conn-dot conn-dot--${connStatus}`}
            title={`Supabase: ${connStatus === 'checking' ? 'Checking…' : connMessage}`}
            aria-live="polite"
          >
            <span className="conn-dot__pip" aria-hidden />
            <span className="conn-dot__label">
              {connStatus === 'ok' ? 'Connected' : connStatus === 'checking' ? 'Checking…' : 'Offline'}
            </span>
          </div>
          <span>Task Manager v1.0.0</span>
        </footer>
      </main>
    </div>
  )
}
