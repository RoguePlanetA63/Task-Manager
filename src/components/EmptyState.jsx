export default function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-state__art" aria-hidden>
        <span className="empty-state__circle" />
        <span className="empty-state__circle empty-state__circle--two" />
        <span className="empty-state__circle empty-state__circle--three" />
      </div>
      <h2 className="empty-state__title">{title}</h2>
      {description ? <p className="empty-state__desc">{description}</p> : null}
      {actionLabel ? (
        <button type="button" className="btn btn--primary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
