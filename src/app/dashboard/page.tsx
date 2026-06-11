import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import { createRoom } from '@/app/actions/room'
import JoinRoomForm from '@/components/dashboard/JoinRoomForm'
import Button from '@/components/ui/Button'

export const metadata = { title: 'Dashboard — Mafia' }

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

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-lg font-bold text-text-primary">Mafia</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted">{user.full_name}</span>
            <form action={logout}>
              <Button type="submit" variant="ghost" className="text-xs px-3 py-1.5">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-10">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Welcome */}
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              Welcome, {user.full_name.split(' ')[0]}
            </h1>
            <p className="mt-1 text-text-muted">
              Rank: <span className="text-accent font-semibold">{rank}</span> ·{' '}
              {user.total_score} pts
            </p>
          </div>

          {/* Quick actions */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Create room */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="mb-1 font-semibold text-text-primary">Create a room</h2>
              <p className="mb-4 text-sm text-text-muted">
                Host a new game and invite your friends with a room code.
              </p>
              <form action={createRoom}>
                <Button type="submit" className="w-full">
                  Create room
                </Button>
              </form>
            </div>

            {/* Join room */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="mb-1 font-semibold text-text-primary">Join a room</h2>
              <p className="mb-4 text-sm text-text-muted">
                Enter a 6-character room code to join a game.
              </p>
              <JoinRoomForm />
            </div>
          </div>

          {/* Stats */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Your stats</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Games played" value={user.total_games_played} />
              <StatCard label="Wins" value={user.total_wins} />
              <StatCard label="Losses" value={user.total_losses} />
              <StatCard label="Total score" value={user.total_score} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
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
