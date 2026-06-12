'use client'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Anon-key browser client — safe to expose to the client.
// Used for realtime subscriptions; client-side queries are guarded by RLS.
let _client: SupabaseClient | null = null

/**
 * Returns the shared browser Supabase client, or null when it cannot be
 * created (e.g. NEXT_PUBLIC_* env vars missing from the build).
 *
 * MUST never throw: it is called inside the game's sync effects, and a throw
 * inside a React effect unmounts the whole page — killing not just realtime
 * but the polling fallback with it. Realtime is an optimization; polling is
 * the guaranteed sync baseline and must survive any client failure here.
 */
export function getBrowserClient(): SupabaseClient | null {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.warn('[mafia] Supabase browser env missing — realtime disabled, using polling only.')
    return null
  }
  try {
    _client = createClient(url, key)
  } catch (e) {
    console.warn('[mafia] Supabase client init failed — realtime disabled, using polling only.', e)
    return null
  }
  return _client
}
