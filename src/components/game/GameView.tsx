'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { beginNight, beginNextNight } from '@/app/actions/game'
import AnnouncementFeed from './AnnouncementFeed'
import PhaseTimer from './PhaseTimer'
import NightPanel from './NightPanel'
import VotingPanel from './VotingPanel'
import type { Role, GamePhase, PublicPlayer, Announcement } from '@/types/database'
import Button from '@/components/ui/Button'

type VoteCount = { user_id: string; display_name: string; count: number }

export type GameViewProps = {
  gameId: string
  phase: GamePhase
  roundNumber: number
  phaseDeadline: string | null
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

const PHASE_LABEL: Record<GamePhase, string> = {
  ROLE_REVEAL: 'Role Reveal',
  NIGHT_ACTIONS_OPEN: 'Night',
  NIGHT_RESOLUTION: 'Resolving Night…',
  DAY_ANNOUNCEMENT: 'Morning',
  DISCUSSION: 'Discussion',
  VOTING: 'Voting',
  VOTE_RESOLUTION: 'Vote Results',
  GAME_OVER: 'Game Over',
}

export default function GameView(props: GameViewProps) {
  const {
    gameId, phase, roundNumber, phaseDeadline, winningTeam,
    myRole, myIsAlive, isHost, currentUserId, players,
    announcements, detectiveResult, myNightActionTargetId,
    mafiaCurrentTarget, myVoteTargetId, voteCounts,
  } = props

  const router = useRouter()

  // Poll every 3 s — server re-renders check deadline & advance phase
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 3000)
    return () => clearInterval(id)
  }, [router])

  const roleColors: Record<Role, string> = {
    MAFIA: 'text-red-400', DOCTOR: 'text-blue-400',
    DETECTIVE: 'text-purple-400', VILLAGER: 'text-green-400',
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-text-primary">Mafia</span>
            <span className="text-xs text-text-muted">·</span>
            <span className="text-sm text-text-muted">{PHASE_LABEL[phase]}</span>
            {roundNumber > 0 && (
              <span className="text-xs text-text-muted">· Round {roundNumber}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {myIsAlive ? (
              <span className={`text-xs font-semibold uppercase tracking-wide ${roleColors[myRole]}`}>
                {myRole}
              </span>
            ) : (
              <span className="text-xs text-text-muted">💀 Eliminated</span>
            )}
            <PhaseTimer deadline={phaseDeadline} />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">

          {/* Detective private result */}
          {detectiveResult && (
            <div className="rounded-xl border border-purple-600/40 bg-purple-950/20 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-purple-400">
                Your investigation result
              </p>
              <p className="mt-1 text-sm text-text-primary">{detectiveResult}</p>
            </div>
          )}

          {/* Phase-specific main panel */}
          {phase === 'ROLE_REVEAL' && (
            <div className="rounded-xl border border-border bg-surface p-6 text-center space-y-4">
              <p className="text-text-muted text-sm">
                All players have received their roles. When everyone is ready, the host starts Night 1.
              </p>
              {isHost && (
                <form action={beginNight.bind(null, gameId)}>
                  <Button type="submit" className="w-full py-3">
                    Begin Night 1
                  </Button>
                </form>
              )}
            </div>
          )}

          {(phase === 'NIGHT_ACTIONS_OPEN') && (
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

          {(phase === 'NIGHT_RESOLUTION' || phase === 'DAY_ANNOUNCEMENT') && (
            <div className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-text-muted">
              {phase === 'NIGHT_RESOLUTION' ? 'Resolving night actions…' : 'The village wakes up.'}
            </div>
          )}

          {phase === 'DISCUSSION' && (
            <div className="rounded-xl border border-border bg-surface p-5 text-center space-y-2">
              <p className="text-sm font-semibold text-text-primary">Discussion phase</p>
              <p className="text-xs text-text-muted">
                {myIsAlive ? 'Debate who the Mafia might be. Voting starts when the timer ends.' : 'You are dead. Watch in silence.'}
              </p>
            </div>
          )}

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

          {phase === 'VOTE_RESOLUTION' && isHost && !phaseDeadline && (
            <form action={beginNextNight.bind(null, gameId)}>
              <Button type="submit" className="w-full">
                Begin next night
              </Button>
            </form>
          )}

          {phase === 'GAME_OVER' && (
            <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-3">
              <p className="text-4xl">{winningTeam === 'VILLAGE' ? '🏆' : '🔴'}</p>
              <h2 className="text-2xl font-bold text-text-primary">
                {winningTeam === 'VILLAGE' ? 'Village wins!' : 'Mafia wins!'}
              </h2>
              <p className="text-sm text-text-muted">
                {winningTeam === 'VILLAGE'
                  ? 'All Mafia have been eliminated.'
                  : 'The Mafia now control the village.'}
              </p>
              <a href="/dashboard" className="mt-4 inline-block text-sm text-accent hover:text-accent-hover">
                Back to dashboard
              </a>
            </div>
          )}

          {/* Player list */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
              Players
            </h3>
            <ul className="space-y-2">
              {players.map((p) => (
                <li
                  key={p.user_id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 ${p.is_alive ? 'bg-surface-raised' : 'opacity-40'}`}
                >
                  <div className="h-7 w-7 flex items-center justify-center rounded-full bg-surface text-xs font-bold text-text-muted">
                    {p.display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm text-text-primary">{p.display_name}</span>
                  {!p.is_alive && <span className="text-xs text-text-muted">💀</span>}
                  {p.user_id === currentUserId && <span className="text-xs text-text-muted">(you)</span>}
                  {p.role && !p.is_alive && (
                    <span className="text-xs text-text-muted">{p.role}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Announcement feed */}
          <AnnouncementFeed announcements={announcements} />
        </div>
      </main>
    </div>
  )
}
