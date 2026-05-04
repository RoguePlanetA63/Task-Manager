/** Auth service reachability check (REST, not supabase-js). */
export async function pingAuthHealth() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { ok: false, detail: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local' }
  }
  const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  })
  if (!res.ok) {
    return { ok: false, detail: `Auth health returned ${res.status}` }
  }
  return { ok: true, detail: 'Auth API reachable' }
}
