export function getTaskStatus(task, now = new Date()) {
  const startAt = task?.start_at ? new Date(task.start_at) : null
  const endAt = task?.end_at ? new Date(task.end_at) : null
  const nowTime = now.getTime()

  if (endAt && Number.isFinite(endAt.getTime()) && nowTime >= endAt.getTime()) {
    return 'done'
  }

  if (startAt && Number.isFinite(startAt.getTime()) && nowTime >= startAt.getTime()) {
    return 'in-progress'
  }

  return 'to-do'
}

export function getTaskStatusLabel(status) {
  if (status === 'done') return 'Done'
  if (status === 'in-progress') return 'In Progress'
  return 'To Do'
}

export function formatTaskDate(value) {
  if (!value) return 'No date'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'No date'

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
