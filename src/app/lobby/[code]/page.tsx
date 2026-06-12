import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getGuestSession } from '@/lib/guest-session'
import { createServiceClient } from '@/lib/supabase/server'
import { hasGuestPlayerColumns, playerIdentityFilter } from '@/lib/guest-schema'
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

  // Resolve identity — user session takes precedence over guest cookie
  const [userSession, guestSession] = await Promise.all([getSession(), getGuestSession()])
  const currentUserId  = userSession?.userId ?? null
  const currentGuestId = currentUserId ? null : (guestSession?.guestId ?? null)
  const hasAnyAuth     = !!(currentUserId || currentGuestId)

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

  if (typedRoom.status === 'ACTIVE') {
    const { data: activeGame } = await supabase
      .from('games')
      .select('id, current_phase')
      .eq('room_id', typedRoom.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (activeGame && activeGame.current_phase !== 'GAME_OVER') redirect(`/game/${activeGame.id}`)
  }

  const hasGuestColumns = await hasGuestPlayerColumns(supabase)
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
      .match(playerIdentityFilter({
        userId: null,
        guestId: currentGuestId,
        isGuest: true,
        displayName: guestSession?.displayName ?? null,
      }, hasGuestColumns))
      .maybeSingle()
    mySlot = data
  }

  // Not in the room → show the join form
  if (!mySlot) {
    const prefillName = guestSession?.displayName ?? ''
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-3xl mb-4 animate-glow-pulse">
              🎮
            </div>
            <h1 className="text-2xl font-bold text-text-primary">
              Room <span className="font-mono text-accent">{upperCode}</span>
            </h1>
            <p className="mt-1 text-sm text-text-muted">Enter your name to join the village</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-7 shadow-2xl">
            <GuestJoinForm roomCode={upperCode} prefillName={prefillName} />
          </div>
        </div>
      </main>
    )
  }

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
