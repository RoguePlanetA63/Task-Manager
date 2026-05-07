import { supabase } from './supabaseClient'
import { normalizeEmail } from './emailUtils'

export function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  })
}

export function signUp(email, password) {
  return supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
  })
}

export function signOut() {
  return supabase.auth.signOut()
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      scopes: 'https://www.googleapis.com/auth/calendar',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    }
  })

  if (error) {
    console.error('Login error:', error.message)
  }
}

export async function connectGoogleCalendar() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      scopes: 'https://www.googleapis.com/auth/calendar',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    }
  })

  if (error) {
    console.error('Google Calendar connect error:', error.message)
  }
}

export async function saveGoogleRefreshToken(session) {
  if (!session?.provider_refresh_token) {
    console.warn('No Google refresh token available')
    return
  }

  try {
    const { data, error } = await supabase
      .from('user_google_oauth')
      .upsert({
        user_id: session.user.id,
        google_refresh_token: session.provider_refresh_token,
      })

    if (error) {
      console.error('Error saving Google refresh token:', error.message)
    } else {
      console.log('Google refresh token saved successfully')
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
