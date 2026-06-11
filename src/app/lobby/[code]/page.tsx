import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getGuestSession } from '@/lib/guest-session'
import { createServiceClient } from '@/lib/supabase/server'
import LobbyView from '@/components/lobby/LobbyView'
import LobbyRefresh from '@/components/lobby/LobbyRefresh'
import GuestJoinForm from '@/components/join/GuestJoinForm'
import type { RoomRow, RoomPlayerRow } from '@/types/database'

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return { title: `Room ${code.toUpperCase()} — Mafia` }
}

export default async function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const upperCode = code.toUpperCase()

  // Resolve identity — authenticated user or guest
  const [userSession, guestSession] = await Promise.all([getSession(), getGuestSession()])

  const currentUserId   = userSession?.userId ?? null
  const currentGuestId  = guestSession?.guestId ?? null
  const hasAnyAuth      = !!(currentUserId || currentGuestId)

  // No auth at all → redirect to the public join page
  if (!hasAnyAuth) redirect(`/join/${upperCode}`)

  const supabase = createServiceClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', upperCode)
    .maybeSingle()

  if (!room) notFound()

  const typedRoom = room as RoomRow

  if (typedRoom.status === 'ENDED') {
    redirect(currentUserId ? '/dashboard' : '/')
  }

  // Active room → find the game and redirect there
  if (typedRoom.status === 'ACTIVE') {
    const { data: activeGame } = await supabase
      .from('games')
      .select('id')
      .eq('room_id', typedRoom.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeGame) redirect(`/game/${activeGame.id}`)
    else redirect(currentUserId ? '/dashboard' : '/')
  }

  // Check if this player is already in the room
  let mySlot = null
  if (currentUserId) {
    const { data } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', typedRoom.id)
      .eq('user_id', currentUserId)
      .maybeSingle()
    mySlot = data
  } else if (currentGuestId) {
    const { data } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', typedRoom.id)
      .eq('guest_id', currentGuestId)
      .maybeSingle()
    mySlot = data
  }

  // Not in the room → show a join form (invite link flow)
  if (!mySlot) {
    const prefillName = guestSession?.displayName ?? userSession ? '' : ''
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-text-primary">
              Room <span className="font-mono text-accent">{upperCode}</span>
            </h1>
            <p className="mt-1 text-sm text-text-muted">Enter your name to join</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-7 shadow-2xl">
            <GuestJoinForm roomCode={upperCode} prefillName={prefillName} />
          </div>
        </div>
      </main>
    )
  }

  // Player is in the room — show the full lobby
  const { data: players } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', typedRoom.id)
    .order('joined_at', { ascending: true })

  return (
    <>
      <LobbyRefresh />
      <LobbyView
        room={typedRoom}
        players={(players ?? []) as RoomPlayerRow[]}
        currentUserId={currentUserId}
        currentGuestId={currentGuestId}
      />
    </>
  )
}
