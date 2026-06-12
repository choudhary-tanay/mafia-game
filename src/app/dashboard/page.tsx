import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import { createRoom } from '@/app/actions/room'
import JoinRoomForm from '@/components/dashboard/JoinRoomForm'
import RulesButton from '@/components/rules/RulesModal'
import Button from '@/components/ui/Button'
import { LogOut, Plus, Zap, Target, TrendingUp } from 'lucide-react'

export const metadata = { title: 'Dashboard — Mafia' }

const RANK_META: Record<string, { icon: string; color: string; bg: string; border: string; next: number }> = {
  'Newcomer':          { icon: '🌱', color: 'text-emerald-400', bg: 'bg-emerald-950/20', border: 'border-emerald-800/40', next: 100 },
  'Street Watcher':    { icon: '👁️', color: 'text-blue-400',    bg: 'bg-blue-950/20',    border: 'border-blue-800/40',    next: 500 },
  'Silent Strategist': { icon: '🃏', color: 'text-purple-400',  bg: 'bg-purple-950/20',  border: 'border-purple-800/40',  next: 1000 },
  'Village Hero':      { icon: '🛡️', color: 'text-amber-400',   bg: 'bg-amber-950/20',   border: 'border-amber-800/40',   next: 2000 },
  'Mafia Master':      { icon: '🔴', color: 'text-red-400',     bg: 'bg-red-950/20',     border: 'border-red-800/40',     next: Infinity },
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

  if (error || !user) redirect('/logout')

  const rank = getRank(user.total_score)
  const rankMeta = RANK_META[rank]
  const winRate = user.total_games_played > 0
    ? Math.round((user.total_wins / user.total_games_played) * 100)
    : 0
  const progressPct = rankMeta.next < Infinity
    ? Math.min(100, Math.round((user.total_score / rankMeta.next) * 100))
    : 100
  const firstName = user.full_name.split(' ')[0]

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface/90 backdrop-blur-sm px-4 sm:px-6 py-4 sticky top-0 z-10 flex-shrink-0">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-sm">🔴</div>
            <span className="font-black text-text-primary tracking-tight">Mafia</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <RulesButton />
            <Link href="/profile" className="text-sm text-text-muted hover:text-text-primary transition-colors hidden sm:block">
              {user.full_name}
            </Link>
            <Link href="/profile" className="text-xs text-text-muted hover:text-text-primary transition-colors sm:hidden">
              Profile
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:text-red-400 hover:border-red-900/60 hover:bg-red-950/20 transition-all"
              >
                <LogOut size={13} />
                <span className="hidden sm:block">Log out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-8">

          {/* ── Welcome + rank ───────────────────────────────────────────────── */}
          <div className="animate-fade-up">
            <div className={`rounded-2xl border ${rankMeta.border} ${rankMeta.bg} p-6 flex flex-col sm:flex-row sm:items-center gap-5`}>
              {/* Avatar */}
              <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border-2 ${rankMeta.border} text-3xl font-black ${rankMeta.color}`}>
                {user.full_name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1">Welcome back</p>
                <h1 className="text-2xl sm:text-3xl font-black text-text-primary truncate">
                  {firstName}
                </h1>
                <p className="text-sm text-text-muted">{user.email}</p>
              </div>

              {/* Rank */}
              <div className={`text-center flex-shrink-0 rounded-xl border ${rankMeta.border} ${rankMeta.bg} px-5 py-3`}>
                <div className="text-3xl mb-1">{rankMeta.icon}</div>
                <p className={`font-bold text-sm ${rankMeta.color}`}>{rank}</p>
                <p className="text-xs text-text-muted">{user.total_score.toLocaleString()} pts</p>
              </div>
            </div>

            {/* Progress bar */}
            {rankMeta.next < Infinity && (
              <div className="mt-3 px-1">
                <div className="flex justify-between text-xs text-text-faint mb-1.5">
                  <span>Progress to next rank</span>
                  <span>{user.total_score} / {rankMeta.next} pts</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-raised overflow-hidden">
                  <div
                    className={`h-full rounded-full ${rankMeta.color.replace('text-', 'bg-').replace('-400', '-600')}`}
                    style={{ width: `${progressPct}%`, transition: 'width 0.8s ease' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Actions ──────────────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            {/* Create room */}
            <div className="rounded-2xl border border-red-900/40 bg-gradient-to-b from-red-950/25 to-surface p-6 space-y-4 shadow-lg shadow-red-950/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-900/40 text-red-400">
                  <Plus size={20} />
                </div>
                <div>
                  <p className="font-bold text-text-primary">Create a room</p>
                  <p className="text-xs text-text-muted">Host a new game</p>
                </div>
              </div>
              <form action={createRoom}>
                <Button type="submit" className="w-full py-3 font-bold">
                  <Zap size={16} />
                  Create room
                </Button>
              </form>
            </div>

            {/* Join room */}
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-raised text-text-muted">
                  <Target size={20} />
                </div>
                <div>
                  <p className="font-bold text-text-primary">Join a room</p>
                  <p className="text-xs text-text-muted">Enter a room code</p>
                </div>
              </div>
              <JoinRoomForm />
            </div>
          </div>

          {/* ── Stats ────────────────────────────────────────────────────────── */}
          <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
                <TrendingUp size={13} />
                Your stats
              </h2>
              <Link href="/profile" className="text-xs text-text-muted hover:text-text-primary transition-colors">
                View full profile →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Games" value={user.total_games_played} icon="🎲" />
              <StatCard label="Wins" value={user.total_wins} icon="🏆" highlight />
              <StatCard label="Losses" value={user.total_losses} icon="💀" />
              <StatCard label="Win rate" value={`${winRate}%`} icon="📈" />
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

function StatCard({
  label, value, icon, highlight = false,
}: {
  label: string; value: number | string; icon: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${
      highlight
        ? 'border-accent/30 bg-gradient-to-b from-accent/10 to-surface'
        : 'border-border bg-surface'
    }`}>
      <p className="text-xs text-text-muted uppercase tracking-wide flex items-center gap-1.5 mb-2">
        <span>{icon}</span> {label}
      </p>
      <p className={`text-3xl font-black tabular-nums ${highlight ? 'text-accent' : 'text-text-primary'}`}>
        {value}
      </p>
    </div>
  )
}

function getRank(score: number): string {
  if (score >= 2000) return 'Mafia Master'
  if (score >= 1000) return 'Village Hero'
  if (score >= 500)  return 'Silent Strategist'
  if (score >= 100)  return 'Street Watcher'
  return 'Newcomer'
}
