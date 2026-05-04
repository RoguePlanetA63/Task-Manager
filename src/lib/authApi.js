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
