import { supabase } from './supabaseClient'
import { normalizeEmail } from './emailUtils'

export function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  })
}

export async function signUp(email, password) {
  const normalizedEmail = normalizeEmail(email)
  const result = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
  })

  if (result.error || !result.data?.user?.id) {
    return result
  }

  const { error: profileError } = await supabase.from('users_table').upsert(
    {
      id: result.data.user.id,
      email: normalizedEmail,
      display_name: null,
      phone: null,
      description: null,
      isCon2Google: false,
      g_refreshToken: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )

  if (profileError) {
    return {
      data: result.data,
      error: profileError,
    }
  }

  return result
}

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      scopes: 'https://www.googleapis.com/auth/calendar',
      queryParams: {
        access_type: 'offline',
      },
    }
  })
}

export function signOut() {
  return supabase.auth.signOut()
}

export async function connectGoogleCalendar(email) {
  const loginHint = normalizeEmail(email)

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      scopes: 'https://www.googleapis.com/auth/calendar',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
        ...(loginHint ? { login_hint: loginHint } : {}),
      },
    }
  })

  if (error) {
    console.error('Google Calendar connect error:', error.message)
  }
}

export async function saveGoogleRefreshToken(session) {
  if (!session?.user?.id) {
    return
  }

  const refreshToken = session.provider_refresh_token
  const metadata = session.user.user_metadata ?? {}
  const displayName =
    metadata.full_name?.trim() || metadata.name?.trim() || metadata.display_name?.trim() || null

  try {
    const fields = {
      id: session.user.id,
      email: normalizeEmail(session.user.email ?? ''),
      ...(displayName ? { display_name: displayName } : {}),
      updated_at: new Date().toISOString(),
    }

    if (refreshToken) {
      fields.g_refreshToken = refreshToken
      fields.isCon2Google = true
    }

    const { error } = await supabase
      .from('users_table')
      .upsert(fields, { onConflict: 'id' })

    if (error) {
      console.error('Error saving Google user data:', error.message)
    } else {
      console.log('Google user data saved successfully')
    }
  } catch (err) {
    console.error('Save token error:', err)
  }
}

export async function checkUserExists(email) {
  const { data, error } = await supabase.rpc('user_exists', {
    user_email: email
  })

  if (error) {
    console.error('Error checking user existence:', error.message)
    return false
  }

  return data
}
