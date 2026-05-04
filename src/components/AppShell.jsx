import SegmentedNav from './SegmentedNav.jsx'
import UserMenu from './UserMenu.jsx'

export default function AppShell({
  email,
  theme,
  onToggleTheme,
  onSignOut,
  onOpenProfile,
  navOptions,
  navValue,
  onNavChange,
  suppressSegmentedNav,
  mainWide,
  conn,
  children,
}) {
  const connStatus = conn?.status ?? 'checking'
  const connMessage = conn?.message ?? ''
  const showError = connStatus === 'error'

  return (
    <div className="shell">
      <header className="topbar" role="banner">
        <div className="topbar__inner">
          <div className="topbar__brand">
            <span className="topbar__logo" aria-hidden />
            <span className="topbar__title">Task Manager</span>
          </div>

          <div className="topbar__actions">
            <UserMenu
              email={email}
              theme={theme}
              onToggleTheme={onToggleTheme}
              onSignOut={onSignOut}
              onOpenProfile={onOpenProfile}
            />
          </div>
        </div>

        {navOptions?.length && !suppressSegmentedNav ? (
          <div className="topbar__nav">
            <SegmentedNav value={navValue} onChange={onNavChange} options={navOptions} />
          </div>
        ) : null}
      </header>

      <main className={`shell__main${mainWide ? ' shell__main--wide' : ''}`}>
        {showError ? (
          <div className="conn-banner conn-banner--error" role="alert">
            <strong>Supabase connection error.</strong> {connMessage}
          </div>
        ) : null}
        {children}
      </main>

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
    </div>
  )
}
