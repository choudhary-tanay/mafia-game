import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS, NEVER used on the client.
// Use only inside Server Components, Server Actions, and Route Handlers.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
