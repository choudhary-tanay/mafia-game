import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase/server'
import { joinRoom } from '@/app/actions/room'
import LobbyView from '@/components/lobby/LobbyView'
import LobbyRefresh from '@/components/lobby/LobbyRefresh'
import type { RoomRow, RoomPlayerRow } from '@/types/database'
import Button from '@/components/ui/Button'

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return { title: `Room ${code.toUpperCase()} — Mafia` }
}

export default async function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const upperCode = code.toUpperCase()

  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const supabase = createServiceClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', upperCode)
    .maybeSingle()

  if (!room) notFound()

  const typedRoom = room as RoomRow

  if (typedRoom.status === 'ENDED') {
    redirect('/dashboard')
  }

  // Check if user is in the room
  const { data: mySlot } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', typedRoom.id)
    .eq('user_id', session.userId)
    .maybeSingle()

  // Not in the room yet — show invite/join page
  if (!mySlot) {
    if (typedRoom.status !== 'LOBBY') {
      return (
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-lg font-semibold text-text-primary">Game in progress</p>
            <p className="mt-2 text-sm text-text-muted">This room is no longer accepting players.</p>
            <a href="/dashboard" className="mt-6 block text-sm text-accent hover:text-accent-hover">
              ← Back to dashboard
            </a>
          </div>
        </main>
      )
    }

    // Show join confirmation for invite links
    const { data: hostPlayer } = await supabase
      .from('room_players')
      .select('display_name')
      .eq('room_id', typedRoom.id)
      .eq('is_host', true)
      .maybeSingle()

    const { count } = await supabase
      .from('room_players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', typedRoom.id)

    const joinWithCode = async (formData: FormData): Promise<void> => {
      'use server'
      formData.set('code', upperCode)
      await joinRoom(undefined, formData)
    }

    return (
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent">
            You&apos;ve been invited
          </p>
          <h1 className="mb-2 text-2xl font-bold text-text-primary">
            Room <span className="font-mono">{upperCode}</span>
          </h1>
          {hostPlayer && (
            <p className="mb-1 text-sm text-text-muted">
              Hosted by {hostPlayer.display_name}
            </p>
          )}
          <p className="mb-6 text-sm text-text-muted">{count ?? 0} player(s) waiting</p>
          <form action={joinWithCode}>
            <Button type="submit" className="w-full py-3">
              Join this game
            </Button>
          </form>
          <a href="/dashboard" className="mt-4 block text-sm text-text-muted hover:text-text-primary">
            Cancel
          </a>
        </div>
      </main>
    )
  }

  // Fetch all players
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
        currentUserId={session.userId}
      />
    </>
  )
}
