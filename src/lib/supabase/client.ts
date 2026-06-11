'use client'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Anon-key browser client — safe to expose to the client.
// Used for future realtime subscriptions (Phase 6) and client-side queries guarded by RLS.
let _client: SupabaseClient | undefined

export function getBrowserClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return _client
}
