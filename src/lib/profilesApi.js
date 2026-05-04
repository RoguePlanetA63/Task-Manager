import { supabase } from './supabaseClient'
import { normalizeEmail } from './emailUtils'

export function fetchProfile(userId) {
  if (!userId) {
    return Promise.resolve({ data: null, error: { message: 'Missing user id' } })
  }
  return supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
}

export function fetchProfileByEmail(email) {
  const e = normalizeEmail(email)
  if (!e) {
    return Promise.resolve({ data: null, error: { message: 'Missing email' } })
  }
  return supabase.from('profiles').select('*').eq('email', e).maybeSingle()
}

/** Batch lookup for task cards (emails must match stored normalized `profiles.email`). */
export function fetchProfilesByEmails(emails) {
  const list = [...new Set(emails.map((x) => normalizeEmail(x)).filter(Boolean))]
  if (!list.length) {
    return Promise.resolve({ data: [], error: null })
  }
  return supabase.from('profiles').select('id, email, display_name').in('email', list)
}

export function upsertProfile(userId, { displayName, phone, description, accountEmail }) {
  if (!userId) {
    return Promise.resolve({ data: null, error: { message: 'Missing user id' } })
  }
  const emailNorm = accountEmail ? normalizeEmail(accountEmail) : null
  return supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        display_name: displayName?.trim() || null,
        phone: phone?.trim() || null,
        description: description?.trim() || null,
        ...(emailNorm ? { email: emailNorm } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select()
    .single()
}
