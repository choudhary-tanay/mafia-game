import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { VillagerGroup } from '@/components/ui/illustrations'

export const metadata = { title: 'Profile — Mafia' }

// ─── Rank helpers (mirrored from dashboard) ───────────────────────────────────
const RANK_CONFIG: Record<string, { icon: string; color: string; next: number }> = {
  'Newcomer':          { icon: '🌱', color: 'text-green-400',  next: 100  },
  'Street Watcher':    { icon: '👁️',  color: 'text-blue-400',   next: 500  },
  'Silent Strategist': { icon: '🃏', color: 'text-purple-400', next: 1000 },
  'Village Hero':      { icon: '🛡️', color: 'text-amber-400',  next: 2000 },
  'Mafia Master':      { icon: '🔴', color: 'text-red-400',    next: Infinity },
}

function getRank(score: number) {
  if (score >= 2000) return 'Mafia Master'
  if (score >= 1000) return 'Village Hero'
  if (score >= 500)  return 'Silent Strategist'
  if (score >= 100)  return 'Street Watcher'
  return 'Newcomer'
}

const ROLE_ICON: Record<string, string> = {
  MAFIA: '🔴', DOCTOR: '💊', DETECTIVE: '🔍', VILLAGER: '👤',
}
const ROLE_COLOR: Record<string, string> = {
  MAFIA: 'text-red-400', DOCTOR: 'text-cyan-400',
  DETECTIVE: 'text-purple-400', VILLAGER: 'text-green-400',
}

export default async function ProfilePage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const supabase = createServiceClient()

  type UserProfile = {
    id: string; full_name: string; email: string; sex: string; avatar_url: string | null
    total_score: number; total_games_played: number; total_wins: number; total_losses: number
    mafia_wins: number; village_wins: number; games_as_mafia: number; games_as_doctor: number
    games_as_detective: number; games_as_villager: number; successful_doctor_saves: number
    successful_detective_finds: number; correct_votes_against_mafia: number; survived_games: number
    created_at: string
  }

  const { data: rawUser, error } = await supabase
    .from('users')
    .select(
      'id,full_name,email,sex,avatar_url,total_score,total_games_played,' +
      'total_wins,total_losses,mafia_wins,village_wins,games_as_mafia,' +
      'games_as_doctor,games_as_detective,games_as_villager,' +
      'successful_doctor_saves,successful_detective_finds,' +
      'correct_votes_against_mafia,survived_games,created_at',
    )
    .eq('id', session.userId)
    .single()

  if (error || !rawUser) redirect('/logout')
  const user = rawUser as unknown as UserProfile

  // Recent game history (last 12)
  const { data: recentGames } = await supabase
    .from('player_game_stats')
    .select('role,team,won,survived_to_end,score_delta,created_at')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(12)

  const rank = getRank(user.total_score)
  const rankCfg = RANK_CONFIG[rank]
  const winRate = user.total_games_played > 0
    ? Math.round((user.total_wins / user.total_games_played) * 100)
    : 0

  // Progress to next rank
  const progressPct = rankCfg.next < Infinity
    ? Math.min(100, Math.round((user.total_score / rankCfg.next) * 100))
    : 100

  // Most played role
  const rolePlays = {
    MAFIA: user.games_as_mafia, DOCTOR: user.games_as_doctor,
    DETECTIVE: user.games_as_detective, VILLAGER: user.games_as_villager,
  }
  const mostPlayed = Object.entries(rolePlays).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur-sm px-5 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/dashboard" className="text-sm text-text-muted hover:text-text-primary transition-colors">
            ← Dashboard
          </Link>
          <form action={logout}>
            <Button type="submit" variant="ghost" className="text-xs px-3 py-1.5">Log out</Button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">

          {/* ── Profile hero ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center animate-fade-up">
            {/* Avatar */}
            <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 ${rankCfg.color.replace('text-', 'border-')}/40 bg-surface-raised text-2xl font-bold ${rankCfg.color}`}>
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl tracking-wide text-text-primary truncate">{user.full_name}</h1>
              <p className="text-sm text-text-muted truncate">{user.email}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {user.sex === 'PREFER_NOT_TO_SAY' ? 'Prefer not to say' : user.sex?.charAt(0) + user.sex?.slice(1).toLowerCase()}
              </p>
            </div>
            {/* Rank */}
            <div className="text-center sm:text-right flex-shrink-0">
              <p className="text-2xl">{rankCfg.icon}</p>
              <p className={`font-bold text-sm ${rankCfg.color}`}>{rank}</p>
              <p className="text-xs text-text-muted">{user.total_score.toLocaleString()} pts</p>
            </div>
          </div>

          {/* Rank progress bar */}
          {rankCfg.next < Infinity && (
            <div className="rounded-xl border border-border bg-surface px-5 py-4 space-y-2 animate-fade-up" style={{ animationDelay: '40ms' }}>
              <div className="flex justify-between text-xs text-text-muted">
                <span>Progress to next rank</span>
                <span>{user.total_score.toLocaleString()} / {rankCfg.next.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-raised overflow-hidden">
                <div
                  className="h-2 rounded-full bg-accent transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Summary stats ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: '80ms' }}>
            <StatTile icon="🎲" label="Games" value={user.total_games_played} />
            <StatTile icon="🏆" label="Wins"  value={user.total_wins} accent />
            <StatTile icon="💀" label="Losses" value={user.total_losses} />
            <StatTile icon="📈" label="Win rate" value={`${winRate}%`} />
          </div>

          {/* ── Role breakdown ────────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-surface p-5 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
                Role history
              </h2>
              {mostPlayed[1] > 0 && (
                <span className={`text-xs font-medium ${ROLE_COLOR[mostPlayed[0]]}`}>
                  Most played: {ROLE_ICON[mostPlayed[0]]} {mostPlayed[0].charAt(0) + mostPlayed[0].slice(1).toLowerCase()}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['MAFIA', 'DOCTOR', 'DETECTIVE', 'VILLAGER'] as const).map((role) => (
                <div key={role} className="rounded-lg bg-surface-raised p-3 text-center">
                  <p className="text-xl mb-1">{ROLE_ICON[role]}</p>
                  <p className={`text-xs font-semibold ${ROLE_COLOR[role]}`}>{role}</p>
                  <p className="text-lg font-bold text-text-primary mt-0.5">
                    {rolePlays[role]}
                  </p>
                  <p className="text-xs text-text-muted">games</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Achievements ──────────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-surface p-5 animate-fade-up" style={{ animationDelay: '160ms' }}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-muted">
              Achievements
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <AchievementTile icon="🛡️" label="Doctor saves" value={user.successful_doctor_saves} />
              <AchievementTile icon="🔍" label="Mafia identified" value={user.successful_detective_finds} />
              <AchievementTile icon="🗳️" label="Correct Mafia votes" value={user.correct_votes_against_mafia} />
              <AchievementTile icon="🏁" label="Survived to end" value={user.survived_games} />
              <AchievementTile icon="🔴" label="Mafia wins" value={user.mafia_wins} />
              <AchievementTile icon="🌿" label="Village wins" value={user.village_wins} />
            </div>
          </div>

          {/* ── Recent game history ───────────────────────────────────────── */}
          {recentGames && recentGames.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-5 animate-fade-up" style={{ animationDelay: '200ms' }}>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-muted">
                Recent games
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 text-xs text-text-muted font-medium">Date</th>
                      <th className="pb-2 text-xs text-text-muted font-medium">Role</th>
                      <th className="pb-2 text-xs text-text-muted font-medium">Result</th>
                      <th className="pb-2 text-xs text-text-muted font-medium">Survived</th>
                      <th className="pb-2 text-xs text-text-muted font-medium text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentGames.map((g, i) => (
                      <tr key={i} className="text-text-primary">
                        <td className="py-2.5 text-xs text-text-muted">
                          {new Date(g.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5">
                          <span className={`font-medium text-xs ${ROLE_COLOR[g.role] ?? 'text-text-muted'}`}>
                            {ROLE_ICON[g.role]} {g.role}
                          </span>
                        </td>
                        <td className="py-2.5">
                          {g.won
                            ? <span className="text-green-400 font-semibold text-xs">WIN</span>
                            : <span className="text-red-400 text-xs">LOSS</span>}
                        </td>
                        <td className="py-2.5 text-xs">
                          {g.survived_to_end ? '✅' : '💀'}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-xs text-accent">
                          +{g.score_delta}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {recentGames?.length === 0 && (
            <div className="rounded-xl border border-border bg-surface animate-fade-up">
              <EmptyState
                icon={<VillagerGroup size={56} />}
                title="No games played yet."
                hint="Create or join a room — the village is waiting for you."
              />
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

function StatTile({ icon, label, value, accent = false }: { icon: string; label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${accent ? 'border-accent/30 bg-accent/5 hover:border-accent/50' : 'border-border bg-surface hover:border-border-bright'}`}>
      <p className="text-xs text-text-muted flex items-center gap-1">{icon} {label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ? 'text-accent' : 'text-text-primary'}`}>{value}</p>
    </div>
  )
}

function AchievementTile({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-raised p-3">
      <p className="text-lg mb-1">{icon}</p>
      <p className="text-xs text-text-muted leading-tight">{label}</p>
      <p className="text-xl font-bold text-text-primary tabular-nums">{value}</p>
    </div>
  )
}
