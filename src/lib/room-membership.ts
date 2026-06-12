// Shared room-membership mutations used by both the authenticated and the
// guest leave/create/join actions, so host promotion and empty-room cleanup
// behave identically for every identity type.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  hasGuestPlayerColumns,
  legacyGuestIdsForUsers,
  playerIdentityFilter,
} from '@/lib/guest-schema'
import type { PlayerIdentity } from '@/lib/identity'

type RoomHostInfo = {
  id: string
  host_user_id: string | null
  host_guest_id?: string | null
}

/** Removes a player from a room. Deletes the room when it empties; when the
 *  departing player was host, promotes the longest-waiting remaining player
 *  (skipping candidates deleted by concurrent leaves). */
export async function removeFromRoomWithPromotion(
  supabase: SupabaseClient,
  room: RoomHostInfo,
  identity: PlayerIdentity,
): Promise<void> {
  const hasGuestColumns = await hasGuestPlayerColumns(supabase)

  await supabase
    .from('room_players')
    .delete()
    .eq('room_id', room.id)
    .match(playerIdentityFilter(identity, hasGuestColumns))

  const { data: remaining } = await supabase
    .from('room_players')
    .select(hasGuestColumns ? 'user_id, guest_id, is_guest' : 'user_id')
    .eq('room_id', room.id)
    .order('joined_at', { ascending: true })

  if (!remaining || remaining.length === 0) {
    await supabase.from('rooms').delete().eq('id', room.id)
    return
  }

  const wasHost =
    (!!identity.userId && room.host_user_id === identity.userId) ||
    (!!identity.guestId && room.host_guest_id === identity.guestId)
  if (!wasHost) return

  for (const candidate of remaining as unknown as {
    user_id: string | null
    guest_id?: string | null
  }[]) {
    let nextUserId = candidate.user_id ?? null
    let nextGuestId = hasGuestColumns ? (candidate.guest_id ?? null) : null

    if (!hasGuestColumns && nextUserId) {
      const legacyGuestIds = await legacyGuestIdsForUsers(supabase, [nextUserId])
      if (legacyGuestIds.has(nextUserId)) {
        nextGuestId = nextUserId
        nextUserId = null
      }
    }

    // Mark is_host on the candidate's row; zero rows back means a concurrent
    // leave removed them — try the next candidate.
    let promote = supabase.from('room_players').update({ is_host: true }).eq('room_id', room.id)
    if (nextUserId) promote = promote.eq('user_id', nextUserId)
    else if (hasGuestColumns) promote = promote.eq('guest_id', nextGuestId!)
    else promote = promote.eq('user_id', nextGuestId!)
    const { data: promoted } = await promote.select('id')
    if (!promoted?.length) continue

    await supabase
      .from('rooms')
      .update({ host_user_id: nextUserId, host_guest_id: nextGuestId })
      .eq('id', room.id)
    return
  }

  // Every candidate vanished while we worked — the room is empty after all.
  await supabase.from('rooms').delete().eq('id', room.id)
}

/** Removes the player from every LOBBY room they're in. Called before creating
 *  or joining another room so ghost memberships never accumulate. */
export async function leaveAllLobbyRooms(
  supabase: SupabaseClient,
  identity: PlayerIdentity,
): Promise<void> {
  const hasGuestColumns = await hasGuestPlayerColumns(supabase)
  const { data: memberships } = await supabase
    .from('room_players')
    .select('room_id, rooms!inner(id, status, host_user_id, host_guest_id)')
    .match(playerIdentityFilter(identity, hasGuestColumns))
    .eq('rooms.status', 'LOBBY')

  for (const m of (memberships ?? []) as unknown as { rooms: RoomHostInfo }[]) {
    await removeFromRoomWithPromotion(supabase, m.rooms, identity)
  }
}
