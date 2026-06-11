import 'server-only'
import { getSession } from '@/lib/session'
import { getGuestSession } from '@/lib/guest-session'

export type PlayerIdentity = {
  userId: string | null
  guestId: string | null
  isGuest: boolean
  displayName: string | null
}

/** Resolves the current request's player identity from either the user session
 *  (authenticated) or the guest session cookie. Returns null if neither exists. */
export async function getPlayerIdentity(): Promise<PlayerIdentity | null> {
  const session = await getSession()
  if (session?.userId) {
    return { userId: session.userId, guestId: null, isGuest: false, displayName: null }
  }
  const guest = await getGuestSession()
  if (guest?.guestId) {
    return { userId: null, guestId: guest.guestId, isGuest: true, displayName: guest.displayName }
  }
  return null
}

/** Returns the Supabase `.match()` filter to find this player's row. */
export function playerFilter(identity: PlayerIdentity): Record<string, string | null> {
  if (identity.userId) return { user_id: identity.userId }
  return { guest_id: identity.guestId! }
}
