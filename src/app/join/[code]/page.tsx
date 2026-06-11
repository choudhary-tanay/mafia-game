import { getSession } from '@/lib/session'
import { getGuestSession } from '@/lib/guest-session'
import { createServiceClient } from '@/lib/supabase/server'
import { hasGuestPlayerColumns, playerIdentityFilter } from '@/lib/guest-schema'
import GuestJoinForm from '@/components/join/GuestJoinForm'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return { title: `Join ${code.toUpperCase()} — Mafia` }
}

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const upperCode = code.toUpperCase()

  // Look up room info for display
  const supabase = createServiceClient()
  const { data: room } = await supabase
    .from('rooms')
    .select('id, code, status')
    .eq('code', upperCode)
    .maybeSingle()

  // Prefill name if user is already logged in
  let prefillName = ''
  const session = await getSession()
  const guestSession = session?.userId ? null : await getGuestSession()
  if (session?.userId) {
    const { data: user } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', session.userId)
      .single()
    if (user) prefillName = user.full_name as string
  } else if (guestSession?.displayName) {
    prefillName = guestSession.displayName
  }

  if (!room) {
    return (
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center animate-fade-up">
          <p className="text-3xl mb-4">🚫</p>
          <h1 className="text-xl font-bold text-text-primary mb-2">Room not found</h1>
          <p className="text-sm text-text-muted mb-6">
            This room does not exist or has expired.
          </p>
          <Link href="/" className="text-sm text-accent hover:text-accent-hover">
            ← Back to home
          </Link>
        </div>
      </main>
    )
  }

  if (room.status !== 'LOBBY') {
    return (
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center animate-fade-up">
          <p className="text-3xl mb-4">⏱️</p>
          <h1 className="text-xl font-bold text-text-primary mb-2">Game already started</h1>
          <p className="text-sm text-text-muted mb-6">
            Room <span className="font-mono font-bold text-accent">{upperCode}</span> is in progress.
          </p>
          <Link href="/" className="text-sm text-accent hover:text-accent-hover">
            ← Back to home
          </Link>
        </div>
      </main>
    )
  }

  const hasGuestColumns = await hasGuestPlayerColumns(supabase)
  if (session?.userId) {
    const { data: existing } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', session.userId)
      .maybeSingle()

    if (existing) redirect(`/lobby/${room.code}`)
  } else if (guestSession?.guestId) {
    const { data: existing } = await supabase
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

    if (existing) redirect(`/lobby/${room.code}`)
  }

  // Count players already in the room
  const { count } = await supabase
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id)

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-xl mb-4">
            🎮
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Join the game</h1>
          <p className="mt-1 text-sm text-text-muted">
            Room <span className="font-mono font-bold text-accent">{upperCode}</span> ·{' '}
            {count ?? 0} player{(count ?? 0) !== 1 ? 's' : ''} waiting
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-7 shadow-2xl space-y-4">
          <p className="text-sm text-text-muted text-center">
            Enter your name to join. No account required.
          </p>
          <GuestJoinForm roomCode={upperCode} prefillName={prefillName} />
        </div>
      </div>
    </main>
  )
}
