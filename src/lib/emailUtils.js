/** Practical format check before calling auth APIs; normalize for storage and comparison. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email) {
  return String(email).trim().toLowerCase()
}

export function isValidEmail(email) {
  const n = normalizeEmail(email)
  if (n.length > 254) return false
  return EMAIL_RE.test(n)
}
