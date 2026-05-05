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
      redirectTo: window.location.origin
    }
  })

  if (error) {
    console.error('Login error:', error.message)
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
