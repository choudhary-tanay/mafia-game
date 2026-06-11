'use server'

import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { getPlayerIdentity } from '@/lib/identity'
import { createGuestSession } from '@/lib/guest-session'
import {
  ensureLegacyGuestUser,
  hasGuestPlayerColumns,
  legacyGuestIdsForUsers,
  playerIdentityFilter,
  roomPlayerInsertPayload,
} from '@/lib/guest-schema'
import { joinRoomSchema, updateSettingsSchema } from '@/lib/validations'
import { type GuestActionState } from '@/app/actions/guest'

export type RoomActionState = {
  errors?: Record<string, string[]>
  generalError?: string
  success?: boolean
} | undefined

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function generateUniqueCode(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<string> {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  for (let i = 0; i < 10; i++) {
    const code = Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('')
    const { data } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', code)
      .maybeSingle()
    if (!data) return code
  }
  throw new Error('Could not generate a unique room code')
}

/** Returns true when the given identity is the host of the room */
function identityIsHost(
  room: { host_user_id: string | null; host_guest_id?: string | null },
  identity: { userId: string | null; guestId: string | null },
): boolean {
  if (identity.userId  && room.host_user_id  === identity.userId)  return true
  if (identity.guestId && room.host_guest_id === identity.guestId) return true
  return false
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Create a room as an authenticated user */
export async function createRoom(): Promise<void> {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const supabase = createServiceClient()

  // If user is already in a lobby, send them there
  const { data: existing } = await supabase
    .from('room_players')
    .select('room_id, rooms!inner(code, status)')
    .eq('user_id', session.userId)
    .eq('rooms.status', 'LOBBY')
    .maybeSingle()

  if (existing) {
    const roomData = existing.rooms as unknown as { code: string }
    redirect(`/lobby/${roomData.code}`)
  }

  const { data: user } = await supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', session.userId)
    .single()

  if (!user) redirect('/login')

  const code = await generateUniqueCode(supabase)

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      code,
      host_user_id: session.userId,
      host_guest_id: null,
      status: 'LOBBY',
      mafia_count: 1,
      discussion_timer_seconds: 180,
      voting_timer_seconds: 60,
      night_timer_seconds: 60,
      reveal_role_on_death: true,
      tie_rule: 'NO_ELIMINATION',
    })
    .select('id, code')
    .single()

  if (error || !room) redirect('/dashboard')

  const hasGuestColumns = await hasGuestPlayerColumns(supabase)
  const { error: playerError } = await supabase.from('room_players').insert(
    roomPlayerInsertPayload({
      hasGuestColumns,
      roomId: room.id,
      userId: session.userId,
      displayName: user.full_name as string,
      avatarUrl: user.avatar_url ?? null,
      isHost: true,
    }),
  )

  if (playerError) {
    await supabase.from('rooms').delete().eq('id', room.id)
    redirect('/dashboard')
  }

  redirect(`/lobby/${room.code}`)
}

/** Create a room as a guest (no account required) */
export async function createRoomAsGuest(
  state: GuestActionState,
  formData: FormData,
): Promise<GuestActionState> {
  const displayName = (formData.get('displayName') as string | null)?.trim() ?? ''

  if (displayName.length < 2)
    return { errors: { displayName: ['Name must be at least 2 characters.'] } }
  if (displayName.length > 24)
    return { errors: { displayName: ['Name must be 24 characters or fewer.'] } }

  const supabase = createServiceClient()
  const guestId = crypto.randomUUID()
  const code    = await generateUniqueCode(supabase)

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      code,
      host_user_id: null,
      host_guest_id: guestId,
      status: 'LOBBY',
      mafia_count: 1,
      discussion_timer_seconds: 180,
      voting_timer_seconds: 60,
      night_timer_seconds: 60,
      reveal_role_on_death: true,
      tie_rule: 'NO_ELIMINATION',
    })
    .select('id, code')
    .single()

  if (error || !room) return { generalError: 'Could not create room. Please try again.' }

  const hasGuestColumns = await hasGuestPlayerColumns(supabase)
  if (!hasGuestColumns) {
    const compatibilityError = await ensureLegacyGuestUser(supabase, guestId, displayName)
    if (compatibilityError) {
      await supabase.from('rooms').delete().eq('id', room.id)
      return { generalError: 'Could not create guest session. Please try again.' }
    }
  }

  const { error: playerError } = await supabase.from('room_players').insert(
    roomPlayerInsertPayload({
      hasGuestColumns,
      roomId: room.id,
      guestId,
      displayName,
      isHost: true,
    }),
  )

  if (playerError) {
    await supabase.from('rooms').delete().eq('id', room.id)
    return { generalError: 'Could not add you to the room. Please try again.' }
  }

  await createGuestSession(guestId, displayName, room.id)
  return { redirectTo: `/lobby/${room.code}` }
}

export async function joinRoom(
  state: RoomActionState,
  formData: FormData,
): Promise<RoomActionState> {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const raw = { code: (formData.get('code') as string | null)?.toUpperCase() ?? '' }
  const result = joinRoomSchema.safeParse(raw)

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const supabase = createServiceClient()
  const { data: room } = await supabase
    .from('rooms')
    .select('id, code, status')
    .eq('code', result.data.code)
    .maybeSingle()

  if (!room) return { generalError: 'Room not found. Check the code and try again.' }
  if (room.status !== 'LOBBY') return { generalError: 'This game has already started.' }

  const { data: existing } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', room.id)
    .eq('user_id', session.userId)
    .maybeSingle()

  if (existing) redirect(`/lobby/${room.code}`)

  const { data: user } = await supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', session.userId)
    .single()

  if (!user) redirect('/login')

  const hasGuestColumns = await hasGuestPlayerColumns(supabase)
  const { error } = await supabase.from('room_players').insert({
    ...roomPlayerInsertPayload({
      hasGuestColumns,
      roomId: room.id,
      userId: session.userId,
      displayName: user.full_name as string,
      avatarUrl: user.avatar_url ?? null,
      isHost: false,
    }),
  })

  if (error) return { generalError: 'Could not join room. Please try again.' }

  redirect(`/lobby/${room.code}`)
}

export async function leaveRoom(roomCode: string): Promise<void> {
  const identity = await getPlayerIdentity()
  if (!identity) redirect('/')

  const supabase = createServiceClient()
  const { data: room } = await supabase
    .from('rooms')
    .select('id, host_user_id, host_guest_id, status')
    .eq('code', roomCode)
    .maybeSingle()

  if (!room || room.status !== 'LOBBY') {
    redirect(identity.userId ? '/dashboard' : '/')
  }

  // Remove this player from room_players
  const hasGuestColumns = await hasGuestPlayerColumns(supabase)
  await supabase.from('room_players').delete()
    .eq('room_id', room.id)
    .match(playerIdentityFilter(identity, hasGuestColumns))

  const { data: remaining } = await supabase
    .from('room_players')
    .select(hasGuestColumns ? 'user_id, guest_id, is_guest' : 'user_id')
    .eq('room_id', room.id)
    .order('joined_at', { ascending: true })

  if (!remaining || remaining.length === 0) {
    await supabase.from('rooms').delete().eq('id', room.id)
  } else if (identityIsHost(room as { host_user_id: string | null; host_guest_id: string | null }, identity)) {
    // Promote first remaining player to host
    const next = remaining[0] as unknown as { user_id: string | null; guest_id?: string | null; is_guest?: boolean | null }
    let nextUserId = next.user_id ?? null
    let nextGuestId = hasGuestColumns ? (next.guest_id ?? null) : null

    if (!hasGuestColumns && nextUserId) {
      const legacyGuestIds = await legacyGuestIdsForUsers(supabase, [nextUserId])
      if (legacyGuestIds.has(nextUserId)) {
        nextGuestId = nextUserId
        nextUserId = null
      }
    }

    await supabase.from('rooms').update({
      host_user_id:  nextUserId,
      host_guest_id: nextGuestId,
    }).eq('id', room.id)

    if (nextUserId) {
      await supabase.from('room_players').update({ is_host: true })
        .eq('room_id', room.id).eq('user_id', nextUserId)
    } else if (nextGuestId) {
      const hostQuery = supabase.from('room_players').update({ is_host: true }).eq('room_id', room.id)
      if (hasGuestColumns) await hostQuery.eq('guest_id', nextGuestId)
      else await hostQuery.eq('user_id', nextGuestId)
    }
  }

  redirect(identity.userId ? '/dashboard' : '/')
}

export async function updateSettings(
  state: RoomActionState,
  formData: FormData,
): Promise<RoomActionState> {
  const identity = await getPlayerIdentity()
  if (!identity) redirect('/')

  const roomCode = formData.get('roomCode') as string

  const raw = {
    mafiaCount:              formData.get('mafiaCount'),
    discussionTimerSeconds:  formData.get('discussionTimerSeconds'),
    votingTimerSeconds:      formData.get('votingTimerSeconds'),
    nightTimerSeconds:       formData.get('nightTimerSeconds'),
  }

  const result = updateSettingsSchema.safeParse(raw)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const revealRoleOnDeath = formData.get('revealRoleOnDeath') === 'on'
  const supabase = createServiceClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('id, host_user_id, host_guest_id')
    .eq('code', roomCode)
    .maybeSingle()

  if (!room) redirect('/')
  if (!identityIsHost(room as { host_user_id: string | null; host_guest_id: string | null }, identity)) {
    return { generalError: 'Only the host can update settings.' }
  }

  const { error } = await supabase
    .from('rooms')
    .update({
      mafia_count:              result.data.mafiaCount,
      discussion_timer_seconds: result.data.discussionTimerSeconds,
      voting_timer_seconds:     result.data.votingTimerSeconds,
      night_timer_seconds:      result.data.nightTimerSeconds,
      reveal_role_on_death:     revealRoleOnDeath,
    })
    .eq('id', room.id)

  if (error) return { generalError: 'Could not save settings.' }
  return { success: true }
}
