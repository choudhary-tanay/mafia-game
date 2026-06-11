'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { beginNight, beginNextNight } from '@/app/actions/game'
import AnnouncementFeed from './AnnouncementFeed'
import CircularTimer from './CircularTimer'
import PhaseBanner from './PhaseBanner'
import NightPanel from './NightPanel'
import VotingPanel from './VotingPanel'
import RulesButton from '@/components/rules/RulesModal'
import type { Role, GamePhase, PublicPlayer, Announcement } from '@/types/database'
import Button from '@/components/ui/Button'

type VoteCount = { user_id: string; display_name: string; count: number }

export type GameViewProps = {
  gameId: string
  phase: GamePhase
  roundNumber: number
  phaseDeadline: string | null
  isGuest?: boolean
  winningTeam: string | null
  myRole: Role
  myIsAlive: boolean
  isHost: boolean
  currentUserId: string
  players: PublicPlayer[]
  announcements: Announcement[]
  detectiveResult: string | null
  myNightActionTargetId: string | null | undefined
  mafiaCurrentTarget: string | null
  myVoteTargetId: string | null | undefined
  voteCounts?: VoteCount[]
  revealRoleOnDeath: boolean
}

// Seconds per phase (for CircularTimer proportion)
const PHASE_TOTAL: Partial<Record<GamePhase, number>> = {
  NIGHT_ACTIONS_OPEN: 60,
  DISCUSSION: 180,
  VOTING: 60,
}

const ROLE_COLOR: Record<Role, string> = {
  MAFIA: 'text-red-400',
  DOCTOR: 'text-cyan-400',
  DETECTIVE: 'text-purple-400',
  VILLAGER: 'text-green-400',
}

const ROLE_BADGE: Record<Role, string> = {
  MAFIA: 'border-red-600/50 bg-red-950/30',
  DOCTOR: 'border-cyan-600/50 bg-cyan-950/20',
  DETECTIVE: 'border-purple-600/50 bg-purple-950/20',
  VILLAGER: 'border-green-600/50 bg-green-950/20',
}

// Phase-level background tint applied to <main>
const PHASE_BG: Partial<Record<GamePhase, string>> = {
  NIGHT_ACTIONS_OPEN: 'bg-blue-950/10',
  NIGHT_RESOLUTION:   'bg-blue-950/10',
  VOTING:             'bg-red-950/10',
}

export default function GameView(props: GameViewProps) {
  const {
    gameId, phase, roundNumber, phaseDeadline, winningTeam,
    myRole, myIsAlive, isHost, currentUserId, players,
    announcements, detectiveResult, myNightActionTargetId,
    mafiaCurrentTarget, myVoteTargetId, voteCounts,
    isGuest = false,
  } = props

  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 3000)
    return () => clearInterval(id)
  }, [router])

  const phaseBg = PHASE_BG[phase] ?? ''
  const totalSecs = PHASE_TOTAL[phase] ?? 60

  return (
    <div className={`flex flex-1 flex-col ${phaseBg} transition-colors duration-700`}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">

          {/* Left: brand + role badge */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-bold text-text-primary hidden sm:block">Mafia</span>
            <div
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${myIsAlive ? ROLE_BADGE[myRole] : 'border-border bg-surface-raised opacity-50'}`}
            >
              <span className={`text-xs font-bold ${myIsAlive ? ROLE_COLOR[myRole] : 'text-text-muted'}`}>
                {myRole}
              </span>
              {!myIsAlive && <span className="text-xs">💀</span>}
            </div>
          </div>

          {/* Centre: round label (hidden on xs) */}
          <p className="hidden sm:block text-xs text-text-muted">
            {roundNumber > 0 ? `Round ${roundNumber}` : 'Role Reveal'}
          </p>

          {/* Right: timer + rules */}
          <div className="flex items-center gap-3">
            <RulesButton />
            <CircularTimer deadline={phaseDeadline} totalSeconds={totalSecs} />
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-5">

          {/* Two-column on lg+ */}
          <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 space-y-4 lg:space-y-0">

            {/* ── Left column ─────────────────────────────────────────── */}
            <div className="space-y-4 min-w-0">

              {/* Phase banner */}
              {phase !== 'ROLE_REVEAL' && phase !== 'GAME_OVER' && (
                <PhaseBanner phase={phase} round={roundNumber} />
              )}

              {/* Detective private result */}
              {detectiveResult && (
                <div className="rounded-xl border border-purple-600/40 bg-purple-950/20 px-4 py-3 animate-fade-up">
                  <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-1">
                    🔍 Your investigation result
                  </p>
                  <p className="text-sm text-text-primary">{detectiveResult}</p>
                </div>
              )}

              {/* ROLE_REVEAL waiting */}
              {phase === 'ROLE_REVEAL' && (
                <div className="rounded-xl border border-border bg-surface p-6 text-center space-y-4 animate-fade-up">
                  <p className="text-text-muted text-sm">
                    All players have received their roles. When everyone is ready, the host starts Night 1.
                  </p>
                  {isHost && (
                    <form action={beginNight.bind(null, gameId)}>
                      <Button type="submit" className="px-8 py-3">
                        Begin Night 1
                      </Button>
                    </form>
                  )}
                  {!isHost && (
                    <p className="text-xs text-text-muted">Waiting for the host…</p>
                  )}
                </div>
              )}

              {/* Night action panel */}
              {phase === 'NIGHT_ACTIONS_OPEN' && (
                <NightPanel
                  gameId={gameId}
                  myRole={myRole}
                  isAlive={myIsAlive}
                  players={players}
                  currentUserId={currentUserId}
                  submittedTargetId={myNightActionTargetId ?? null}
                  mafiaCurrentTarget={mafiaCurrentTarget}
                />
              )}

              {/* Night resolving */}
              {phase === 'NIGHT_RESOLUTION' && (
                <div className="rounded-xl border border-blue-800/30 bg-blue-950/20 p-5 text-center animate-fade-up">
                  <p className="text-sm text-blue-300">⚙️ Resolving night actions…</p>
                </div>
              )}

              {/* Discussion */}
              {(phase === 'DAY_ANNOUNCEMENT' || phase === 'DISCUSSION') && (
                <div className="rounded-xl border border-amber-700/30 bg-amber-950/10 p-5 space-y-2 animate-fade-up">
                  <p className="text-sm font-semibold text-amber-300">
                    {phase === 'DAY_ANNOUNCEMENT' ? '☀️ Morning has arrived' : '💬 Discussion phase'}
                  </p>
                  <p className="text-xs text-text-muted">
                    {myIsAlive
                      ? 'Debate who the Mafia might be. Voting starts when the timer ends.'
                      : 'You are eliminated. Watch and reflect.'}
                  </p>
                </div>
              )}

              {/* Voting & vote resolution */}
              {(phase === 'VOTING' || phase === 'VOTE_RESOLUTION') && (
                <VotingPanel
                  gameId={gameId}
                  isAlive={myIsAlive}
                  players={players}
                  currentUserId={currentUserId}
                  myVoteTargetId={myVoteTargetId}
                  voteCounts={voteCounts}
                  phase={phase}
                />
              )}

              {/* After vote — host advances */}
              {/* Fallback button — auto-advance via maybeAdvancePhase handles this normally */}
              {phase === 'VOTE_RESOLUTION' && isHost && (
                <form action={beginNextNight.bind(null, gameId)} className="animate-fade-up">
                  <Button type="submit" className="w-full">Begin next night</Button>
                </form>
              )}

              {/* Game over */}
              {phase === 'GAME_OVER' && (
                <div className="rounded-2xl border border-border bg-surface p-8 text-center space-y-4 animate-card-reveal">
                  <p className="text-5xl">{winningTeam === 'VILLAGE' ? '🏆' : '🔴'}</p>
                  <h2 className={`text-3xl font-bold ${winningTeam === 'VILLAGE' ? 'text-green-400' : 'text-red-400'}`}>
                    {winningTeam === 'VILLAGE' ? 'Village wins!' : 'Mafia wins!'}
                  </h2>
                  <p className="text-text-muted text-sm">
                    {winningTeam === 'VILLAGE'
                      ? 'All Mafia players have been eliminated. The village is safe.'
                      : 'The Mafia now outnumber and control the village.'}
                  </p>
                  {isGuest ? (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-400">
                        You played as a guest. Your score for this game is temporary.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center mt-2">
                        <a href="/signup" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors">
                          Create account to save score
                        </a>
                        <a href="/" className="rounded-lg border border-border px-5 py-2.5 text-sm text-text-muted hover:text-text-primary transition-colors">
                          Continue as guest
                        </a>
                      </div>
                    </div>
                  ) : (
                    <a
                      href="/dashboard"
                      className="inline-block mt-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
                    >
                      Back to dashboard
                    </a>
                  )}
                </div>
              )}

              {/* Player grid */}
              <PlayerGrid players={players} currentUserId={currentUserId} />
            </div>

            {/* ── Right column: announcements ─────────────────────────── */}
            <div className="lg:sticky lg:top-20 lg:self-start">
              <AnnouncementFeed announcements={announcements} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ── Player grid (inline — small enough to not need its own file) ─────────── */
function PlayerGrid({
  players,
  currentUserId,
}: {
  players: PublicPlayer[]
  currentUserId: string
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
        Players ({players.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {players.map((p) => {
          const isMe = p.user_id === currentUserId
          return (
            <div
              key={p.user_id}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-opacity ${
                p.is_alive
                  ? 'border-border bg-surface-raised'
                  : 'border-transparent bg-surface opacity-40'
              } ${isMe ? 'ring-1 ring-accent/40' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                  p.is_alive
                    ? 'bg-accent/15 text-accent'
                    : 'bg-surface text-text-muted'
                }`}
              >
                {p.is_alive ? p.display_name.charAt(0).toUpperCase() : '💀'}
              </div>
              {/* Name */}
              <span
                className={`text-xs font-medium text-center leading-tight line-clamp-1 w-full ${
                  p.is_alive ? 'text-text-primary' : 'text-text-muted line-through'
                }`}
              >
                {p.display_name}
              </span>
              {/* Badges */}
              {isMe && (
                <span className="text-xs text-text-muted">(you)</span>
              )}
              {p.role && !p.is_alive && (
                <span className="text-xs text-text-muted">{p.role}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
