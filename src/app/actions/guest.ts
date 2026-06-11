'use server'

import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { createGuestSession, deleteGuestSession, getGuestSession } from '@/lib/guest-session'
import { getSession } from '@/lib/session'
import {
  ensureLegacyGuestUser,
  hasGuestPlayerColumns,
  playerIdentityFilter,
  roomPlayerInsertPayload,
} from '@/lib/guest-schema'

export type GuestActionState = {
  errors?: Record<string, string[]>
  generalError?: string
  redirectTo?: string
} | undefined

export async function joinAsGuest(
  state: GuestActionState,
  formData: FormData,
): Promise<GuestActionState> {
  const code = (formData.get('code') as string | null)?.toUpperCase()?.trim() ?? ''
  const displayName = (formData.get('displayName') as string | null)?.trim() ?? ''

  // Validation
  if (!code || code.length !== 6) return { errors: { code: ['Room code must be 6 characters.'] } }
  if (displayName.length < 2) return { errors: { displayName: ['Name must be at least 2 characters.'] } }
  if (displayName.length > 24) return { errors: { displayName: ['Name must be 24 characters or fewer.'] } }

  const supabase = createServiceClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('id, code, status')
    .eq('code', code)
    .maybeSingle()

  if (!room) return { generalError: 'This room does not exist or has expired.' }
  if (room.status !== 'LOBBY') return { generalError: 'This game has already started.' }

  const session = await getSession()
  const guestSession = session?.userId ? null : await getGuestSession()
  const hasGuestColumns = await hasGuestPlayerColumns(supabase)

  if (session?.userId) {
    const { data: alreadyIn } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', session.userId)
      .maybeSingle()

    if (alreadyIn) return { redirectTo: `/lobby/${room.code}` }
  } else if (guestSession?.guestId) {
    const { data: alreadyIn } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room.id)
      .match(playerIdentityFilter({
        userId: null,
        guestId: guestSession.guestId,
        isGuest: true,
        displayName: guestSession.displayName,
      }, hasGuestColumns))
      .maybeSingle()

    if (alreadyIn) return { redirectTo: `/lobby/${room.code}` }
  }

  // Duplicate name check
  const { data: existing } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', room.id)
    .ilike('display_name', displayName)
    .maybeSingle()

  if (existing) return { generalError: 'Someone in this room is already using that name.' }

  // If logged in, use the authenticated identity with the display name chosen for this room
  if (session?.userId) {
    const { data: user } = await supabase
      .from('users')
      .select('full_name, avatar_url')
      .eq('id', session.userId)
      .single()

    if (!user) redirect('/login')

    const { error } = await supabase.from('room_players').insert(
      roomPlayerInsertPayload({
        hasGuestColumns,
        roomId: room.id,
        userId: session.userId,
        displayName: displayName || user.full_name,
        avatarUrl: user.avatar_url ?? null,
        isHost: false,
      }),
    )

    if (error) return { generalError: 'Could not join room. Please try again.' }
    return { redirectTo: `/lobby/${room.code}` }
  }

  // Guest join
  const guestId = crypto.randomUUID()

  if (!hasGuestColumns) {
    const compatibilityError = await ensureLegacyGuestUser(supabase, guestId, displayName)
    if (compatibilityError) {
      return { generalError: 'Could not create guest session. Please try again.' }
    }
  }

  const { error } = await supabase.from('room_players').insert(
    roomPlayerInsertPayload({
      hasGuestColumns,
      roomId: room.id,
      guestId,
      displayName,
      isHost: false,
    }),
  )

  if (error) return { generalError: 'Could not join room. Please try again.' }

  await createGuestSession(guestId, displayName, room.id)
  return { redirectTo: `/lobby/${room.code}` }
}

export async function leaveRoomAsGuest(roomCode: string): Promise<void> {
  const guest = await getGuestSession()
  if (!guest) redirect('/')

  const supabase = createServiceClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('id')
    .eq('code', roomCode)
    .maybeSingle()

  if (room) {
    const hasGuestColumns = await hasGuestPlayerColumns(supabase)
    await supabase
      .from('room_players')
      .delete()
      .eq('room_id', room.id)
      .match(playerIdentityFilter({
        userId: null,
        guestId: guest.guestId,
        isGuest: true,
        displayName: guest.displayName,
      }, hasGuestColumns))
  }

  await deleteGuestSession()
  redirect('/')
}
