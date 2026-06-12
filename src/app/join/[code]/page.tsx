import { getSession } from '@/lib/session'
import { getGuestSession } from '@/lib/guest-session'
import { createServiceClient } from '@/lib/supabase/server'
import { hasGuestPlayerColumns, playerIdentityFilter } from '@/lib/guest-schema'
import GuestJoinForm from '@/components/join/GuestJoinForm'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return { title: `Join ${code.toUpperCase()} — Mafia` }
}

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const upperCode = code.toUpperCase()

  const supabase = createServiceClient()
  const { data: room } = await supabase
    .from('rooms')
    .select('id, code, status')
    .eq('code', upperCode)
    .maybeSingle()

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
        <div className="w-full max-w-sm text-center animate-fade-up">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-2xl font-bold text-text-primary mb-3">Room not found</h1>
          <p className="text-text-muted mb-8">
            This room does not exist or has expired.<br />Check the code and try again.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-6 py-3 text-sm font-semibold text-text-primary hover:bg-surface-high transition-all"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    )
  }

  if (room.status !== 'LOBBY') {
    return (
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm text-center animate-fade-up">
          <div className="text-6xl mb-6">⏱️</div>
          <h1 className="text-2xl font-bold text-text-primary mb-3">Game in progress</h1>
          <p className="text-text-muted mb-2">
            Room <span className="font-mono font-bold text-accent">{upperCode}</span> has already started.
          </p>
          <p className="text-text-muted text-sm mb-8">You can join the next game when this one ends.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-6 py-3 text-sm font-semibold text-text-primary hover:bg-surface-high transition-all"
          >
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

  const { count } = await supabase
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id)

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">
        {/* Room header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-3xl mb-4 animate-glow-pulse">
            🎮
          </div>
          <h1 className="text-2xl font-bold text-text-primary">You&apos;ve been invited</h1>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="rounded-xl border border-border bg-surface-raised px-4 py-1.5 font-mono text-lg font-bold tracking-widest text-accent">
              {upperCode}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-3 text-sm text-text-muted">
            <Users size={14} />
            <span>{count ?? 0} player{(count ?? 0) !== 1 ? 's' : ''} waiting</span>
          </div>
        </div>

        {/* Join form */}
        <div className="rounded-2xl border border-border bg-surface p-7 shadow-2xl">
          <p className="text-center text-sm text-text-muted mb-5">
            Enter your name to join the village. No account required.
          </p>
          <GuestJoinForm roomCode={upperCode} prefillName={prefillName} />
        </div>
      </div>
    </main>
  )
}
