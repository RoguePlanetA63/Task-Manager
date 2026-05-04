export default function SkeletonCards({ count = 3 }) {
  return (
    <ul className="card-grid" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="task-card task-card--skeleton">
          <div className="skeleton skeleton--line skeleton--title" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line skeleton--short" />
          <div className="task-card__footer">
            <div className="skeleton skeleton--avatar" />
            <div className="skeleton skeleton--line skeleton--pill" />
          </div>
        </li>
      ))}
    </ul>
  )
}
