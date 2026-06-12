'use server'

import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { getPlayerIdentity } from '@/lib/identity'
import { createGuestSession, getGuestSession } from '@/lib/guest-session'
import {
  ensureLegacyGuestUser,
  hasGuestPlayerColumns,
  roomPlayerInsertPayload,
} from '@/lib/guest-schema'
import { leaveAllLobbyRooms, removeFromRoomWithPromotion } from '@/lib/room-membership'
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

/** Picks a display name that's free in the room, suffixing "2", "3", … when
 *  the desired one is taken (case-insensitive). */
async function resolveUniqueDisplayName(
  supabase: ReturnType<typeof createServiceClient>,
  roomId: string,
  desired: string,
): Promise<string> {
  const { data: rows } = await supabase
    .from('room_players')
    .select('display_name')
    .eq('room_id', roomId)
  const taken = new Set((rows ?? []).map((r) => (r.display_name as string).toLowerCase()))
  if (!taken.has(desired.toLowerCase())) return desired
  for (let i = 2; i <= 99; i++) {
    const candidate = `${desired} ${i}`
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
  return `${desired} ${crypto.randomUUID().slice(0, 4)}`
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Create a room as an authenticated user */
export async function createRoom(): Promise<void> {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const supabase = createServiceClient()

  // Clean exit from any lobby they're still in (with host promotion) so
  // "Create room" always does what it says without leaving ghost members.
  await leaveAllLobbyRooms(supabase, {
    userId: session.userId, guestId: null, isGuest: false, displayName: null,
  })

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

/** Create a room from the landing page — works for guests AND logged-in users.
 *  Logged-in users keep their real identity (host_user_id); guests get a
 *  guest session cookie and host_guest_id. */
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
  const session = await getSession()
  // Reuse an existing guest identity so the same person stays recognizable
  // across rooms (a fresh UUID every click leaves ghost rows behind).
  const existingGuest = session?.userId ? null : await getGuestSession()
  const guestId = session?.userId ? null : (existingGuest?.guestId ?? crypto.randomUUID())

  // Clean exit from any lobby this identity is still in (host promotion runs).
  if (session?.userId || existingGuest?.guestId) {
    await leaveAllLobbyRooms(supabase, {
      userId: session?.userId ?? null,
      guestId: session?.userId ? null : existingGuest!.guestId,
      isGuest: !session?.userId,
      displayName: null,
    })
  }

  const code = await generateUniqueCode(supabase)

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      code,
      host_user_id: session?.userId ?? null,
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
  if (guestId && !hasGuestColumns) {
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
      userId: session?.userId ?? null,
      guestId,
      displayName,
      isHost: true,
    }),
  )

  if (playerError) {
    await supabase.from('rooms').delete().eq('id', room.id)
    return { generalError: 'Could not add you to the room. Please try again.' }
  }

  if (guestId) await createGuestSession(guestId, displayName, room.id)
  // Server-side redirect: Next serves a 303 with the guest cookie attached,
  // so the client lands in the lobby with no extra client wiring.
  redirect(`/lobby/${room.code}`)
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

  // Clean exit from other lobbies (with host promotion) before joining this one.
  await leaveAllLobbyRooms(supabase, {
    userId: session.userId, guestId: null, isGuest: false, displayName: null,
  })

  const displayName = await resolveUniqueDisplayName(supabase, room.id, user.full_name as string)

  const hasGuestColumns = await hasGuestPlayerColumns(supabase)
  const { error } = await supabase.from('room_players').insert({
    ...roomPlayerInsertPayload({
      hasGuestColumns,
      roomId: room.id,
      userId: session.userId,
      displayName,
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

  await removeFromRoomWithPromotion(
    supabase,
    room as { id: string; host_user_id: string | null; host_guest_id: string | null },
    identity,
  )

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
