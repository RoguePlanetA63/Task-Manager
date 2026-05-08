import { getDefaultTaskWindow, toDatetimeLocalValue } from '../lib/taskDateRules'
import { formatTaskDate, getTaskStatus, getTaskStatusLabel } from '../lib/taskStatus'

function avatarInitial(label) {
  if (!label) return '·'
  const trimmed = String(label).trim()
  return trimmed ? trimmed[0].toUpperCase() : '·'
}

export default function TaskCard({
  task,
  mine,
  isEditing,
  onBeginEdit,
  onCancelEdit,
  onSubmitEdit,
  onDelete,
  ownerProfile,
  onOpenProfileOwner,
}) {
  const ownerEmail = task.email ?? '—'
  const displayName = ownerProfile?.display_name?.trim()
  const primaryLabel = displayName || ownerEmail
  const showEmailSubline = Boolean(displayName && ownerEmail && ownerEmail !== '—')
  const canOpenProfile = Boolean(
    onOpenProfileOwner && ownerEmail && ownerEmail !== '—',
  )
  const status = getTaskStatus(task)
  const statusLabel = getTaskStatusLabel(status)
  const taskDate = task.end_at || task.start_at
  const taskWindow = getDefaultTaskWindow()

  const ownerButton = canOpenProfile ? (
    <button
      type="button"
      className="task-card__owner task-card__owner--link"
      onClick={() =>
        onOpenProfileOwner({
          userId: ownerProfile?.id,
          email: ownerEmail,
        })
      }
      title={`View profile · ${ownerEmail}`}
      aria-label={`View profile for ${primaryLabel}`}
    >
      <span className="task-card__avatar" aria-hidden>
        {avatarInitial(displayName || ownerEmail)}
      </span>
      <span className="task-card__owner-text">
        <span className="task-card__owner-primary">{primaryLabel}</span>
        {showEmailSubline ? (
          <span className="task-card__owner-email-sub">{ownerEmail}</span>
        ) : null}
      </span>
    </button>
  ) : (
    <div className="task-card__owner" title={ownerEmail}>
      <span className="task-card__avatar" aria-hidden>
        {avatarInitial(displayName || ownerEmail)}
      </span>
      <span className="task-card__owner-text">
        <span className="task-card__owner-primary">{primaryLabel}</span>
        {showEmailSubline ? (
          <span className="task-card__owner-email-sub">{ownerEmail}</span>
        ) : null}
      </span>
    </div>
  )

  return (
    <li className={`task-card task-card--${status}${mine ? ' task-card--mine' : ''}`}>
      {isEditing ? (
        <form className="task-card__edit" onSubmit={(e) => onSubmitEdit(e, task.id)}>
          <label htmlFor={`edit-name-${task.id}`} className="field-label">
            Task name
          </label>
          <input
            id={`edit-name-${task.id}`}
            name="taskName"
            type="text"
            className="field-input"
            defaultValue={task.Task}
            required
          />
          <label htmlFor={`edit-desc-${task.id}`} className="field-label">
            Description
          </label>
          <input
            id={`edit-desc-${task.id}`}
            name="taskDescription"
            type="text"
            className="field-input"
            defaultValue={task.Description ?? ''}
          />
          <label htmlFor={`edit-start-at-${task.id}`} className="field-label">
            Start at
          </label>
          <input
            id={`edit-start-at-${task.id}`}
            name="taskStartAt"
            type="datetime-local"
            className="field-input"
            defaultValue={
              task.start_at
                ? toDatetimeLocalValue(new Date(task.start_at))
                : ''
            }
            min={taskWindow.minStart}
          />
          <label htmlFor={`edit-end-at-${task.id}`} className="field-label">
            End at
          </label>
          <input
            id={`edit-end-at-${task.id}`}
            name="taskEndAt"
            type="datetime-local"
            className="field-input"
            defaultValue={
              task.end_at
                ? toDatetimeLocalValue(new Date(task.end_at))
                : ''
            }
            min={taskWindow.minEnd}
          />
          <div className="task-card__edit-actions">
            <button type="submit" className="btn btn--primary btn--sm">
              Save
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onCancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="task-card__head">
            <h3 className="task-card__title">{task.Task}</h3>
            <span className={`chip chip--${status}`}>{statusLabel}</span>
          </div>
          {task.Description ? (
            <p className="task-card__desc">{task.Description}</p>
          ) : (
            <p className="task-card__desc task-card__desc--empty">No description</p>
          )}
          <div className="task-card__meta">
            <span className="task-card__calendar" aria-hidden />
            <span>{formatTaskDate(taskDate)}</span>
          </div>
          <div className="task-card__footer">
            {ownerButton}
            {mine ? (
              <div className="task-card__actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onBeginEdit(task.id)}
                  aria-label={`Edit ${task.Task}`}
                  title="Edit task"
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => onDelete(task.id)}
                  aria-label={`Delete ${task.Task}`}
                  title="Delete task"
                >
                  ×
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </li>
  )
}
