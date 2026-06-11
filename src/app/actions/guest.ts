'use server'

import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { createGuestSession, deleteGuestSession } from '@/lib/guest-session'
import { getSession } from '@/lib/session'

export type GuestActionState = {
  errors?: Record<string, string[]>
  generalError?: string
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

  // Duplicate name check
  const { data: existing } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', room.id)
    .ilike('display_name', displayName)
    .maybeSingle()

  if (existing) return { generalError: 'Someone in this room is already using that name.' }

  // If logged in, use existing account flow via room actions instead
  const session = await getSession()
  if (session?.userId) {
    // Authenticated user went through the guest join form — add them properly
    const { data: alreadyIn } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', session.userId)
      .maybeSingle()

    if (!alreadyIn) {
      const { data: user } = await supabase
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', session.userId)
        .single()

      if (user) {
        await supabase.from('room_players').insert({
          room_id: room.id,
          user_id: session.userId,
          guest_id: null,
          is_guest: false,
          display_name: displayName || user.full_name,
          avatar_url: user.avatar_url ?? null,
          is_host: false,
          is_connected: true,
        })
      }
    }
    redirect(`/lobby/${room.code}`)
  }

  // Guest join
  const guestId = crypto.randomUUID()

  await supabase.from('room_players').insert({
    room_id: room.id,
    user_id: null,
    guest_id: guestId,
    is_guest: true,
    display_name: displayName,
    avatar_url: null,
    is_host: false,
    is_connected: true,
  })

  await createGuestSession(guestId, displayName, room.id)
  redirect(`/lobby/${room.code}`)
}

export async function leaveRoomAsGuest(roomCode: string): Promise<void> {
  const { getGuestSession } = await import('@/lib/guest-session')
  const guest = await getGuestSession()
  if (!guest) redirect('/')

  const supabase = createServiceClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('id')
    .eq('code', roomCode)
    .maybeSingle()

  if (room) {
    await supabase
      .from('room_players')
      .delete()
      .eq('room_id', room.id)
      .eq('guest_id', guest.guestId)
  }

  await deleteGuestSession()
  redirect('/')
}
