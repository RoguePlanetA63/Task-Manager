import { normalizeEmail } from './emailUtils'

/** Roles that unlock the Admin panel (match `raw_app_meta_data.role` in auth.users). */
const ADMIN_ROLES = new Set(['admin', 'super-admin'])

/** Client-side admin gate. Pair with Supabase RLS for server-side checks. */
export function isAdminSession(session) {
  if (!session?.user) return false
  const meta = session.user.app_metadata ?? {}
  if (meta.admin === true) return true
  const role = meta.role != null ? String(meta.role) : ''
  if (role && ADMIN_ROLES.has(role)) return true
  const raw = import.meta.env.VITE_ADMIN_EMAILS ?? ''
  const allow = raw
    .split(',')
    .map((e) => normalizeEmail(e))
    .filter(Boolean)
  const email = normalizeEmail(session.user.email ?? '')
  return allow.length > 0 && allow.includes(email)
}
