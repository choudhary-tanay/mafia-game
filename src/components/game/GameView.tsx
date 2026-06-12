'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { beginNight, beginNextNight, endDiscussionEarly, pauseGame } from '@/app/actions/game'
import { getBrowserClient } from '@/lib/supabase/client'
import AnnouncementFeed from './AnnouncementFeed'
import CircularTimer from './CircularTimer'
import PhaseBanner from './PhaseBanner'
import NightPanel from './NightPanel'
import NightQuestionCard from './NightQuestionCard'
import BollywoodReactionModal from './BollywoodReactionModal'
import VotingPanel from './VotingPanel'
import RulesButton from '@/components/rules/RulesModal'
import PauseOverlay from './PauseOverlay'
import PhaseTransitionOverlay from './PhaseTransitionOverlay'
import GameHistoryTimeline from './GameHistoryTimeline'
import type { Role, GamePhase, PublicPlayer, Announcement, GameHistory } from '@/types/database'
import type { NightQuestionAnswerRow } from '@/app/actions/night-question'
import type { BollywoodEvent } from '@/lib/bollywood-reactions'
import { getRandomQuestion } from '@/lib/night-questions'
import Button from '@/components/ui/Button'
import { Skull, Play, ChevronRight, MessageCircle, Pause } from 'lucide-react'
import {
  MafiaMask, DoctorShield, DetectiveGlass, VillagerGroup,
  MoonScene, TrophyIcon, SkullMark,
} from '@/components/ui/illustrations'

type VoteCount = { user_id: string; display_name: string; count: number }

export type GameViewProps = {
  gameId: string
  roomCode?: string
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
  mafiaTeamNames?: string[]
  myVoteTargetId: string | null | undefined
  voteCounts?: VoteCount[]
  revealRoleOnDeath: boolean
  timers?: { night: number; discussion: number; voting: number }
  // Phase 9 — Night Engagement
  roundId?: string | null
  myNightQuestionAnswer?: NightQuestionAnswerRow | null
  nightThoughts?: string[]
  // Phase 10 — Bollywood Style
  bollywoodMode?: boolean
  bollywoodEvents?: BollywoodEvent[]
  // Phase 11 — Pause / Resume
  isPaused?: boolean
  pausedByName?: string | null
  remainingPausedSecs?: number | null
  // Phase 11 — Game History
  gameHistory?: GameHistory | null
}

const ROLE_COLOR: Record<Role, string> = {
  MAFIA: 'text-red-400',
  DOCTOR: 'text-cyan-400',
  DETECTIVE: 'text-purple-400',
  VILLAGER: 'text-emerald-400',
}

const ROLE_BORDER: Record<Role, string> = {
  MAFIA: 'border-red-700/40 bg-red-950/20',
  DOCTOR: 'border-cyan-700/30 bg-cyan-950/10',
  DETECTIVE: 'border-purple-700/30 bg-purple-950/10',
  VILLAGER: 'border-emerald-700/30 bg-emerald-950/10',
}

/** Tiny role glyph — tints via ROLE_COLOR (currentColor SVGs). */
function RoleIcon({ role, size = 14, className = '' }: { role: Role; size?: number; className?: string }) {
  const cls = `${ROLE_COLOR[role]} ${className}`
  switch (role) {
    case 'MAFIA':     return <MafiaMask size={size} className={cls} />
    case 'DOCTOR':    return <DoctorShield size={size} className={cls} />
    case 'DETECTIVE': return <DetectiveGlass size={size} className={cls} />
    case 'VILLAGER':  return <VillagerGroup size={size} className={cls} />
  }
}

const PHASE_BG: Partial<Record<GamePhase, string>> = {
  ROLE_REVEAL: 'from-indigo-950/20 via-background to-background',
  NIGHT_ACTIONS_OPEN: 'from-blue-950/30 via-indigo-950/10 to-background',
  NIGHT_RESOLUTION: 'from-blue-950/25 via-background to-background',
  DAY_ANNOUNCEMENT: 'from-amber-950/15 via-background to-background',
  DISCUSSION: 'from-amber-950/15 via-background to-background',
  VOTING: 'from-red-950/25 via-background to-background',
  VOTE_RESOLUTION: 'from-red-950/20 via-background to-background',
  GAME_OVER: 'from-background to-background',
}

const AVATAR_COLORS = [
  'bg-red-900/60 text-red-300', 'bg-purple-900/60 text-purple-300',
  'bg-cyan-900/60 text-cyan-300', 'bg-emerald-900/60 text-emerald-300',
  'bg-amber-900/60 text-amber-300', 'bg-blue-900/60 text-blue-300',
  'bg-pink-900/60 text-pink-300', 'bg-indigo-900/60 text-indigo-300',
]

export default function GameView(props: GameViewProps) {
  const {
    gameId, roomCode, phase, roundNumber, phaseDeadline, winningTeam,
    myRole, myIsAlive, isHost, currentUserId, players,
    announcements, detectiveResult, myNightActionTargetId,
    mafiaCurrentTarget, mafiaTeamNames = [],
    myVoteTargetId, voteCounts, timers,
    roundId, myNightQuestionAnswer, nightThoughts = [],
    bollywoodMode = false, bollywoodEvents = [],
    isGuest = false, revealRoleOnDeath,
    isPaused = false, pausedByName, remainingPausedSecs,
    gameHistory,
  } = props

  const [nightQuestion] = useState(() => getRandomQuestion())

  // ── Bollywood reaction queue ─────────────────────────────────────────────
  const [reactionQueue, setReactionQueue] = useState<BollywoodEvent[]>([])
  const currentReaction = reactionQueue[0] ?? null
  const seenBwIds = useRef(new Set<string>())

  useEffect(() => {
    if (!bollywoodMode || bollywoodEvents.length === 0) return
    const fresh = bollywoodEvents.filter((e) => !seenBwIds.current.has(e.id))
    if (fresh.length === 0) return
    fresh.forEach((e) => seenBwIds.current.add(e.id))
    setReactionQueue((q) => [...q, ...fresh])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bollywoodMode, bollywoodEvents.map((e) => e.id).join(',')])

  const router = useRouter()
  const [endingDiscussion, startEndDiscussion] = useTransition()
  const [pausingGame, startPauseGame] = useTransition()
  const gameOver = phase === 'GAME_OVER'

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (gameOver) return
    const supabase = getBrowserClient()
    const channel = supabase
      .channel(`game:${gameId}`)
      .on('broadcast', { event: 'phase_changed' }, () => router.refresh())
      .on('broadcast', { event: 'game_paused' },   () => router.refresh())
      .on('broadcast', { event: 'game_resumed' },  () => router.refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [gameId, router, gameOver])

  // ── Polling fallback ──────────────────────────────────────────────────────
  // Slower while paused (resume must still arrive even if the realtime
  // broadcast is missed — the overlay blocks all other interaction).
  useEffect(() => {
    if (gameOver) return
    const id = setInterval(() => router.refresh(), isPaused ? 10000 : 3000)
    return () => clearInterval(id)
  }, [router, gameOver, isPaused])

  // ── Mobile / background-tab recovery ─────────────────────────────────────
  useEffect(() => {
    if (gameOver) return
    const handler = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [router, gameOver])

  const phaseTotals: Partial<Record<GamePhase, number>> = {
    NIGHT_ACTIONS_OPEN: timers?.night ?? 60,
    DISCUSSION: timers?.discussion ?? 180,
    VOTING: timers?.voting ?? 60,
  }
  const totalSecs = phaseTotals[phase] ?? 60

  const bgGradient = PHASE_BG[phase] ?? 'from-background to-background'

  return (
    <div className={`flex flex-1 flex-col min-h-0 bg-gradient-to-b ${bgGradient} transition-all duration-700`}>

      {/* ── Phase transition cinematic overlay ───────────────────────────────── */}
      <PhaseTransitionOverlay phase={phase} />

      {/* ── Pause overlay ────────────────────────────────────────────────────── */}
      {isPaused && (
        <PauseOverlay
          gameId={gameId}
          isHost={isHost}
          pausedByName={pausedByName}
        />
      )}

      {/* ── Bollywood reaction modal ─────────────────────────────────────────── */}
      {currentReaction && (
        <BollywoodReactionModal
          event={currentReaction}
          onClose={() => setReactionQueue((q) => q.slice(1))}
        />
      )}

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-sm px-4 py-3 flex-shrink-0">
        <h1 className="sr-only">Mafia game — {gameOver ? 'game over' : `round ${roundNumber}`}</h1>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">

          {/* Role badge */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-display text-lg tracking-widest text-text-primary hidden sm:block">Mafia</span>
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${
              myIsAlive ? ROLE_BORDER[myRole] : 'border-border bg-surface-raised opacity-50'
            }`}>
              <RoleIcon role={myRole} size={15} />
              <span className={`text-xs font-bold tracking-wide ${myIsAlive ? ROLE_COLOR[myRole] : 'text-text-muted'}`}>
                {myRole}
              </span>
              {!myIsAlive && <Skull size={11} className="text-text-faint" />}
            </div>
            {roundNumber > 0 && (
              <span className="text-xs text-text-faint hidden sm:block">Round {roundNumber}</span>
            )}
            {/* Hidden on mobile — the timer + full-screen overlay already show paused state */}
            {isPaused && (
              <span className="hidden sm:flex items-center gap-1 rounded-full border border-amber-700/50 bg-amber-950/30 px-2.5 py-1 text-[11px] font-bold text-amber-400 animate-pulse">
                <Pause size={9} /> PAUSED
              </span>
            )}
          </div>

          {/* Timer + host pause + rules */}
          <div className="flex items-center gap-2">
            {/* Host pause button — visible during active phases */}
            {isHost && !gameOver && (
              <button
                onClick={() =>
                  startPauseGame(async () => {
                    await pauseGame(gameId)
                  })
                }
                disabled={pausingGame || isPaused}
                aria-label={isPaused ? 'Game is paused' : 'Pause game'}
                title={isPaused ? 'Game is paused' : 'Pause game'}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  isPaused
                    ? 'border-amber-700/30 bg-amber-950/20 text-amber-500 opacity-50 cursor-default'
                    : 'border-border bg-surface-raised text-text-muted hover:border-amber-700/50 hover:bg-amber-950/20 hover:text-amber-400'
                } disabled:opacity-40`}
              >
                <Pause size={11} />
                <span className="hidden sm:block">{isPaused ? 'Paused' : 'Pause'}</span>
              </button>
            )}
            <RulesButton />
            <CircularTimer
              deadline={phaseDeadline}
              totalSeconds={totalSecs}
              onExpire={() => router.refresh()}
              isPaused={isPaused}
              remainingWhenPaused={remainingPausedSecs}
            />
          </div>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 space-y-5 lg:space-y-0">

            {/* ── Left column ───────────────────────────────────────────────── */}
            <div className="space-y-4 min-w-0">

              {/* Phase banner */}
              {phase !== 'ROLE_REVEAL' && phase !== 'GAME_OVER' && (
                <PhaseBanner phase={phase} round={roundNumber} />
              )}

              {/* Detective private result */}
              {detectiveResult && (
                <div className="rounded-2xl border border-purple-800/40 bg-purple-950/20 px-5 py-4 animate-slide-up role-glow-detective">
                  <div className="flex items-start gap-3">
                    <DetectiveGlass size={24} className="text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">
                        Your investigation result
                      </p>
                      <p className="text-base font-bold text-text-primary">{detectiveResult}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ROLE_REVEAL waiting */}
              {phase === 'ROLE_REVEAL' && (
                <div className="relative overflow-hidden vignette rounded-2xl border border-border bg-surface p-8 text-center animate-fade-up">
                  <div className="fog-layer" aria-hidden="true" />
                  <div className="relative z-10 space-y-5">
                    <MoonScene size={56} className="mx-auto text-blue-300 animate-float" />
                    <div>
                      <h2 className="font-display text-3xl tracking-wider text-text-primary mb-2">All Roles Are Sealed</h2>
                      <p className="text-sm text-text-muted">
                        When everyone has read their role, the host will begin Night 1.
                      </p>
                    </div>
                    {isHost && (
                      <form action={beginNight.bind(null, gameId)}>
                        <Button type="submit" className="px-8 py-3 font-bold animate-breathe">
                          <Play size={16} />
                          Start The Night
                        </Button>
                      </form>
                    )}
                    {!isHost && (
                      <div className="flex items-center justify-center gap-2 text-text-muted text-sm">
                        <div className="w-2 h-2 rounded-full bg-amber-400/60 animate-pulse" />
                        Waiting for the host to start the night…
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Night action panel */}
              {phase === 'NIGHT_ACTIONS_OPEN' && (
                <>
                  <NightPanel
                    gameId={gameId}
                    myRole={myRole}
                    isAlive={myIsAlive}
                    players={players}
                    currentUserId={currentUserId}
                    submittedTargetId={myNightActionTargetId ?? null}
                    mafiaCurrentTarget={mafiaCurrentTarget}
                    mafiaTeamNames={mafiaTeamNames}
                    isPaused={isPaused}
                    roundId={roundId}
                    nightQuestion={nightQuestion}
                    myNightQuestionAnswer={myNightQuestionAnswer}
                  />

                  {myRole === 'VILLAGER' && myIsAlive && roundId && !isPaused && (
                    <NightQuestionCard
                      gameId={gameId}
                      roundId={roundId}
                      question={nightQuestion}
                      existingAnswer={myNightQuestionAnswer}
                    />
                  )}
                </>
              )}

              {/* Night resolving */}
              {phase === 'NIGHT_RESOLUTION' && (
                <div className="relative overflow-hidden rounded-2xl border border-blue-800/30 bg-blue-950/15 p-6 text-center animate-fade-up">
                  <div className="fog-layer" aria-hidden="true" />
                  <div className="relative z-10">
                    <MoonScene size={44} className="mx-auto mb-3 text-blue-300 animate-float" />
                    <p className="text-base font-semibold text-blue-300">Resolving night actions…</p>
                    <p className="text-xs text-text-muted mt-1">The night reveals its secrets in a moment.</p>
                  </div>
                </div>
              )}

              {/* Discussion */}
              {(phase === 'DAY_ANNOUNCEMENT' || phase === 'DISCUSSION') && (
                <div className="rounded-2xl border border-amber-800/30 bg-amber-950/15 p-5 space-y-4 animate-fade-up">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <VillagerGroup size={36} className="text-amber-400/80 flex-shrink-0 mt-1 hidden sm:block" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-1">
                          {phase === 'DAY_ANNOUNCEMENT' ? 'Morning' : 'Discussion'}
                        </p>
                        <p className="text-base font-semibold text-text-primary">
                          {phase === 'DAY_ANNOUNCEMENT' ? 'The village wakes up.' : 'Talk it out. Who is Mafia?'}
                        </p>
                        {myIsAlive ? (
                          <p className="text-xs text-text-muted mt-1">
                            Debate who the Mafia might be. Voting begins when the timer ends.
                          </p>
                        ) : (
                          <p className="text-xs text-red-400 mt-1">You are eliminated. Watch and listen.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {isHost && phase === 'DISCUSSION' && !isPaused && (
                    <div className="border-t border-border/50 pt-4">
                      <p className="text-xs text-text-muted mb-2">Host controls</p>
                      <button
                        onClick={() =>
                          startEndDiscussion(async () => {
                            await endDiscussionEarly(gameId)
                          })
                        }
                        disabled={endingDiscussion}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-700/50 bg-amber-900/20 px-4 py-2.5 text-sm font-bold text-amber-300 hover:bg-amber-900/40 hover:border-amber-600/70 transition-all disabled:opacity-50"
                      >
                        {endingDiscussion ? (
                          <>Starting voting…</>
                        ) : (
                          <>
                            <ChevronRight size={16} />
                            End Discussion &amp; Start Voting
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  {!isHost && phase === 'DISCUSSION' && (
                    <p className="text-xs text-text-faint text-center">
                      Voting starts automatically when the timer ends, or when the host decides.
                    </p>
                  )}
                </div>
              )}

              {/* Night Thoughts */}
              {(phase === 'DISCUSSION' || phase === 'DAY_ANNOUNCEMENT') && nightThoughts.length > 0 && (
                <div className="rounded-2xl border border-blue-900/30 bg-blue-950/15 overflow-hidden animate-fade-up">
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-border/50">
                    <MessageCircle size={15} className="text-blue-400" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Night Thoughts</p>
                      <p className="text-xs text-text-faint">Whispers from the village while everyone waited for morning.</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    {nightThoughts.map((thought, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-xl bg-blue-950/20 border border-blue-900/20 px-4 py-3">
                        <span className="text-blue-600 text-sm mt-0.5 flex-shrink-0">&ldquo;</span>
                        <p className="text-sm text-text-primary leading-relaxed">{thought}</p>
                        <span className="text-blue-600 text-sm self-end flex-shrink-0">&rdquo;</span>
                      </div>
                    ))}
                    <p className="text-xs text-text-faint text-center pt-1">
                      Anonymous · Sharing your thoughts does not reveal your role.
                    </p>
                  </div>
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
                  isPaused={isPaused}
                />
              )}

              {/* After vote — fallback host advance */}
              {phase === 'VOTE_RESOLUTION' && isHost && !isPaused && (
                <form action={beginNextNight.bind(null, gameId)} className="animate-fade-up">
                  <Button variant="ghost" type="submit" className="w-full text-xs">
                    Begin next night (fallback)
                  </Button>
                </form>
              )}

              {/* GAME OVER */}
              {phase === 'GAME_OVER' && (
                <div className="space-y-6 animate-card-reveal">
                  {/* Result banner */}
                  <div className={`rounded-2xl border border-border bg-surface overflow-hidden shadow-2xl`}>
                    <div className={`relative overflow-hidden vignette p-8 sm:p-10 text-center border-b border-border ${
                      winningTeam === 'VILLAGE'
                        ? 'bg-gradient-to-b from-emerald-950/40 to-surface'
                        : 'bg-gradient-to-b from-red-950/50 to-surface'
                    }`}>
                      <div className="fog-layer" aria-hidden="true" />
                      <div className="relative z-10">
                        <div className="mb-5 flex justify-center animate-float">
                          {winningTeam === 'VILLAGE'
                            ? <TrophyIcon size={64} className="text-gold" />
                            : <MafiaMask size={84} className="text-red-500" />}
                        </div>
                        <h2 className={`font-display text-5xl sm:text-6xl tracking-wider leading-none mb-3 ${
                          winningTeam === 'VILLAGE' ? 'text-gold text-glow-gold' : 'text-red-300 text-glow-red'
                        }`}>
                          {winningTeam === 'VILLAGE' ? 'VILLAGE SURVIVES' : 'MAFIA TAKES CONTROL'}
                        </h2>
                        <p className="text-text-muted">
                          {winningTeam === 'VILLAGE'
                            ? 'All Mafia players have been exposed and eliminated.'
                            : 'The Mafia outnumbered and overwhelmed the village.'}
                        </p>
                      </div>
                    </div>

                    {/* Player roles revealed */}
                    <div className="p-6">
                      <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">Final roles</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-6">
                        {players.map((p, i) => (
                          <div
                            key={p.user_id}
                            className={`rounded-xl p-3 text-center border transition-all ${
                              p.is_alive
                                ? 'border-border bg-surface-raised'
                                : 'border-transparent bg-surface opacity-60'
                            }`}
                          >
                            <div className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                              p.is_alive ? AVATAR_COLORS[i % AVATAR_COLORS.length] : 'bg-surface text-text-faint'
                            }`}>
                              {p.is_alive
                                ? p.display_name.charAt(0).toUpperCase()
                                : <SkullMark size={16} className="text-text-faint" />}
                            </div>
                            <p className={`text-xs font-semibold truncate ${p.is_alive ? 'text-text-primary' : 'text-text-muted line-through'}`}>
                              {p.display_name}
                            </p>
                            {p.role && (
                              <p className={`mt-1 flex items-center justify-center gap-1.5 text-xs font-medium ${ROLE_COLOR[p.role]}`}>
                                <RoleIcon role={p.role} size={13} />
                                {p.role}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Guest score note */}
                      {isGuest && (
                        <div className="rounded-xl border border-amber-800/30 bg-amber-950/15 px-4 py-3 mb-4 text-center">
                          <p className="text-xs text-amber-400">
                            You played as a guest. Your score for this game is temporary.
                          </p>
                          <Link
                            href="/signup"
                            className="inline-block mt-2 text-xs font-semibold text-text-primary underline hover:text-accent transition-colors"
                          >
                            Create an account to save your stats →
                          </Link>
                        </div>
                      )}

                      {/* CTAs */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        {roomCode && (
                          <Link
                            href={`/lobby/${roomCode}`}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent-hover shadow-lg shadow-red-900/20 transition-all"
                          >
                            <Play size={15} />
                            Play again
                          </Link>
                        )}
                        {!isGuest ? (
                          <Link
                            href="/dashboard"
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-5 py-3 text-sm font-semibold text-text-primary hover:bg-surface-high transition-all"
                          >
                            Back to dashboard
                          </Link>
                        ) : (
                          <Link
                            href="/"
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-5 py-3 text-sm font-semibold text-text-primary hover:bg-surface-high transition-all"
                          >
                            Back to home
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Game History Timeline */}
                  {gameHistory && (
                    <GameHistoryTimeline history={gameHistory} gameId={gameId} />
                  )}
                </div>
              )}

              {/* Player grid (not on game over) */}
              {phase !== 'GAME_OVER' && (
                <PlayerGrid players={players} currentUserId={currentUserId} revealRoleOnDeath={revealRoleOnDeath} />
              )}
            </div>

            {/* ── Right column: announcements ─────────────────────────────── */}
            <div className="lg:sticky lg:top-[73px] lg:self-start lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto">
              <AnnouncementFeed announcements={announcements} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ── Player Grid ─────────────────────────────────────────────────────────────── */
function PlayerGrid({
  players,
  currentUserId,
  revealRoleOnDeath,
}: {
  players: PublicPlayer[]
  currentUserId: string
  revealRoleOnDeath: boolean
}) {
  const alive = players.filter((p) => p.is_alive)
  const dead  = players.filter((p) => !p.is_alive)

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">
          Players
        </h3>
        <div className="flex items-center gap-3 text-xs text-text-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-glow-pulse" aria-hidden="true" />
            {alive.length} alive
          </span>
          {dead.length > 0 && (
            <span className="flex items-center gap-1.5">
              <SkullMark size={11} className="text-text-faint" />
              {dead.length} out
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {players.map((p, i) => {
          const isMe = p.user_id === currentUserId
          return (
            <div
              key={p.user_id}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all ${
                p.is_alive
                  ? `border-border bg-surface-raised ${isMe ? 'ring-1 ring-accent/30 border-accent/20' : ''}`
                  : 'border-transparent bg-surface opacity-40'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                p.is_alive
                  ? AVATAR_COLORS[i % AVATAR_COLORS.length]
                  : 'bg-surface text-text-faint'
              }`}>
                {p.is_alive
                  ? p.display_name.charAt(0).toUpperCase()
                  : <SkullMark size={18} className="text-text-faint" />}
              </div>
              <span className={`text-xs font-medium text-center leading-tight line-clamp-1 w-full ${
                p.is_alive ? 'text-text-primary' : 'text-text-faint line-through'
              }`}>
                {p.display_name}
              </span>
              <div className="flex flex-wrap justify-center gap-1">
                {isMe && <span className="text-[10px] text-accent font-semibold">you</span>}
                {p.role && !p.is_alive && revealRoleOnDeath && (
                  <span className={`text-xs font-semibold ${ROLE_COLOR[p.role]}`}>{p.role}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
