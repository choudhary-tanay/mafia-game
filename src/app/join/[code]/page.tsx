import { getSession } from '@/lib/session'
import { getGuestSession } from '@/lib/guest-session'
import { createServiceClient } from '@/lib/supabase/server'
import { hasGuestPlayerColumns, playerIdentityFilter } from '@/lib/guest-schema'
import GuestJoinForm from '@/components/join/GuestJoinForm'
import EmptyState from '@/components/ui/EmptyState'
import { SecretDoor, HourglassIcon } from '@/components/ui/illustrations'
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
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 vignette">
        <div className="fog-layer" aria-hidden="true" />
        <div className="relative z-10 w-full max-w-sm text-center animate-fade-up">
          <h1 className="font-display text-4xl tracking-wider text-text-primary mb-1">
            Room Not Found
          </h1>
          <EmptyState
            icon={<SecretDoor size={72} />}
            title="The room does not exist or has expired."
            hint="Check the code and try again — the door you knocked on leads nowhere."
          />
          <Link
            href="/"
            className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-surface-raised px-6 py-3 text-sm font-semibold text-text-primary hover:bg-surface-high hover:border-border-bright transition-all"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    )
  }

  if (room.status !== 'LOBBY') {
    return (
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 vignette">
        <div className="fog-layer" aria-hidden="true" />
        <div className="relative z-10 w-full max-w-sm text-center animate-fade-up">
          <h1 className="font-display text-4xl tracking-wider text-text-primary mb-2">
            Game in Progress
          </h1>
          <p className="text-text-muted">
            Room <span className="font-mono font-bold tracking-widest text-accent">{upperCode}</span> has already started.
          </p>
          <EmptyState
            icon={<HourglassIcon size={64} />}
            title="The village sleeps. Hidden roles make their move."
            hint="You can join the next game when this one ends."
          />
          <Link
            href="/"
            className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-surface-raised px-6 py-3 text-sm font-semibold text-text-primary hover:bg-surface-high hover:border-border-bright transition-all"
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
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 vignette">
      <div className="fog-layer" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md animate-fade-up">
        {/* Room header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent animate-glow-pulse">
            <SecretDoor size={44} />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wider text-text-primary text-glow-red">
            You&apos;ve Been Invited
          </h1>
          <p className="mt-1 text-sm text-text-muted">A secret room awaits behind this door.</p>
          <div className="mt-5 flex items-center justify-center">
            <span className="rounded-2xl border border-accent/30 bg-surface-raised px-6 py-3 font-mono text-3xl font-bold tracking-[0.3em] text-accent text-glow-red">
              {upperCode}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-4 text-sm text-text-muted">
            <Users size={14} aria-hidden="true" />
            <span>{count ?? 0} player{(count ?? 0) !== 1 ? 's' : ''} waiting at the gates</span>
          </div>
        </div>

        {/* Join form */}
        <div className="glass-card noise-overlay relative rounded-2xl p-7 shadow-2xl">
          <p className="text-center text-sm text-text-muted mb-5">
            Enter your name to join the village. No account required.
          </p>
          <GuestJoinForm roomCode={upperCode} prefillName={prefillName} />
        </div>
      </div>
    </main>
  )
}
