import { supabase } from './supabaseClient'
import { normalizeEmail } from './emailUtils'

export function fetchProfile(userId) {
  if (!userId) {
    return Promise.resolve({ data: null, error: { message: 'Missing user id' } })
  }
  return supabase.from('users_table').select('*').eq('id', userId).maybeSingle()
}

export function fetchProfileByEmail(email) {
  const e = normalizeEmail(email)
  if (!e) {
    return Promise.resolve({ data: null, error: { message: 'Missing email' } })
  }
  return supabase.from('users_table').select('*').eq('email', e).maybeSingle()
}

/** Batch lookup for task cards (emails must match stored normalized `users_table.email`). */
export function fetchProfilesByEmails(emails) {
  const list = [...new Set(emails.map((x) => normalizeEmail(x)).filter(Boolean))]
  if (!list.length) {
    return Promise.resolve({ data: [], error: null })
  }
  return supabase.from('users_table').select('id, email, display_name').in('email', list)
}

export async function fetchGoogleConnectionStatus(userId) {
  if (!userId) {
    return { connected: false, displayName: '', error: { message: 'Missing user id' } }
  }

  const { data, error } = await supabase
    .from('users_table')
    .select('isCon2Google, display_name')
    .eq('id', userId)
    .maybeSingle()

  return {
    connected: Boolean(data?.isCon2Google),
    displayName: data?.display_name?.trim() ?? '',
    error,
  }
}

export function upsertProfile(userId, { displayName, phone, description, accountEmail }) {
  if (!userId) {
    return Promise.resolve({ data: null, error: { message: 'Missing user id' } })
  }
  const emailNorm = accountEmail ? normalizeEmail(accountEmail) : null
  return supabase
    .from('users_table')
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
