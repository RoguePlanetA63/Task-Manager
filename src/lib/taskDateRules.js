export const ONE_HOUR_MS = 60 * 60 * 1000

export function addHours(date, hours) {
  return new Date(date.getTime() + hours * ONE_HOUR_MS)
}

export function toDatetimeLocalValue(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function getDefaultTaskWindow(now = new Date()) {
  const start = addHours(now, 1)
  const end = addHours(now, 2)

  return {
    minStart: toDatetimeLocalValue(now),
    minEnd: toDatetimeLocalValue(start),
    defaultStart: toDatetimeLocalValue(start),
    defaultEnd: toDatetimeLocalValue(end),
  }
}

export function validateTaskWindow(startValue, endValue, now = new Date()) {
  const minEnd = addHours(now, 1)
  const start = startValue ? new Date(startValue) : null
  const end = endValue ? new Date(endValue) : null

  if (start && start.getTime() < now.getTime()) {
    return 'Start time cannot be earlier than now.'
  }

  if (end && end.getTime() < minEnd.getTime()) {
    return 'End time must be at least 1 hour from now.'
  }

  if (start && end && end.getTime() <= start.getTime()) {
    return 'End time must be later than start time.'
  }

  return ''
}
