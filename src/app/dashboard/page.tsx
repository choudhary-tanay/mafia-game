import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import { createRoom } from '@/app/actions/room'
import JoinRoomForm from '@/components/dashboard/JoinRoomForm'
import RulesButton from '@/components/rules/RulesModal'
import Button from '@/components/ui/Button'

export const metadata = { title: 'Dashboard — Mafia' }

const RANK_META: Record<string, { icon: string; color: string }> = {
  'Newcomer':          { icon: '🌱', color: 'text-green-400' },
  'Street Watcher':    { icon: '👁️',  color: 'text-blue-400' },
  'Silent Strategist': { icon: '🃏', color: 'text-purple-400' },
  'Village Hero':      { icon: '🛡️', color: 'text-amber-400' },
  'Mafia Master':      { icon: '🔴', color: 'text-red-400' },
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const supabase = createServiceClient()
  const { data: user, error } = await supabase
    .from('users')
    .select('full_name, email, total_score, total_games_played, total_wins, total_losses')
    .eq('id', session.userId)
    .single()

  if (error || !user) redirect('/login')

  const rank = getRank(user.total_score)
  const rankMeta = RANK_META[rank]
  const winRate = user.total_games_played > 0
    ? Math.round((user.total_wins / user.total_games_played) * 100)
    : 0

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface/90 backdrop-blur-sm px-5 py-3 sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-lg font-bold text-text-primary tracking-tight">Mafia</span>
          <div className="flex items-center gap-3">
            <RulesButton />
            <span className="text-sm text-text-muted hidden sm:block">{user.full_name}</span>
            <form action={logout}>
              <Button type="submit" variant="ghost" className="text-xs px-3 py-1.5">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-8">

          {/* Welcome + rank */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
                Welcome back, {user.full_name.split(' ')[0]}
              </h1>
              <p className="mt-1 text-sm text-text-muted">{user.email}</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 self-start sm:self-auto">
              <span className="text-2xl">{rankMeta.icon}</span>
              <div>
                <p className={`font-bold text-sm ${rankMeta.color}`}>{rank}</p>
                <p className="text-xs text-text-muted">{user.total_score} pts</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid gap-4 sm:grid-cols-2 animate-fade-up" style={{ animationDelay: '60ms' }}>
            <div className="rounded-xl border border-border bg-surface p-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎮</span>
                <h2 className="font-semibold text-text-primary">Create a room</h2>
              </div>
              <p className="text-sm text-text-muted">
                Host a new game. Share the room code with friends.
              </p>
              <form action={createRoom}>
                <Button type="submit" className="w-full mt-1">Create room</Button>
              </form>
            </div>

            <div className="rounded-xl border border-border bg-surface p-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚪</span>
                <h2 className="font-semibold text-text-primary">Join a room</h2>
              </div>
              <p className="text-sm text-text-muted">
                Enter a 6-character room code to join.
              </p>
              <JoinRoomForm />
            </div>
          </div>

          {/* Stats */}
          <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-text-muted">
              Your stats
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Games" value={user.total_games_played} icon="🎲" />
              <StatCard label="Wins"  value={user.total_wins}         icon="🏆" accent />
              <StatCard label="Losses" value={user.total_losses}      icon="💀" />
              <StatCard label="Win rate" value={`${winRate}%`}        icon="📈" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({
  label, value, icon, accent = false,
}: {
  label: string; value: number | string; icon: string; accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-accent/30 bg-accent/5' : 'border-border bg-surface'}`}>
      <p className="text-xs text-text-muted uppercase tracking-wide flex items-center gap-1">
        <span>{icon}</span> {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ? 'text-accent' : 'text-text-primary'}`}>
        {value}
      </p>
    </div>
  )
}

function getRank(score: number): string {
  if (score >= 2000) return 'Mafia Master'
  if (score >= 1000) return 'Village Hero'
  if (score >= 500) return 'Silent Strategist'
  if (score >= 100) return 'Street Watcher'
  return 'Newcomer'
}
