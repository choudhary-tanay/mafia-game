import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getGuestSession } from '@/lib/guest-session'
import { createServiceClient } from '@/lib/supabase/server'
import { hasGuestPlayerColumns, playerIdentityFilter } from '@/lib/guest-schema'
import LobbyView from '@/components/lobby/LobbyView'
import LobbyRefresh from '@/components/lobby/LobbyRefresh'
import GuestJoinForm from '@/components/join/GuestJoinForm'
import { SecretDoor } from '@/components/ui/illustrations'
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
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 vignette">
        <div className="fog-layer" aria-hidden="true" />
        <div className="relative w-full max-w-md animate-fade-up">
          <div className="mb-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 mb-4 animate-glow-pulse">
              <SecretDoor size={34} className="text-accent" aria-hidden="true" />
            </div>
            <h1 className="font-display text-3xl tracking-wider text-text-primary">
              Join the village
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              Room{' '}
              <span className="font-mono font-bold tracking-widest text-accent text-glow-red">
                {upperCode}
              </span>
              {' '}— enter your name to take a seat
            </p>
          </div>
          <div className="relative rounded-2xl border border-border bg-surface p-7 shadow-2xl">
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
