'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitVote } from '@/app/actions/game'
import type { PublicPlayer } from '@/types/database'
import { Check, Loader2 } from 'lucide-react'
import { BallotBox, SkullMark, HourglassIcon } from '@/components/ui/illustrations'

type VoteCount = { user_id: string; display_name: string; count: number }

type Props = {
  gameId: string
  isAlive: boolean
  players: PublicPlayer[]
  currentUserId: string
  myVoteTargetId: string | null | undefined
  voteCounts?: VoteCount[]
  phase: string
  isPaused?: boolean
}

const AVATAR_COLORS = [
  'bg-red-900/50 text-red-300',
  'bg-purple-900/50 text-purple-300',
  'bg-cyan-900/50 text-cyan-300',
  'bg-emerald-900/50 text-emerald-300',
  'bg-amber-900/50 text-amber-300',
  'bg-blue-900/50 text-blue-300',
  'bg-pink-900/50 text-pink-300',
]

export default function VotingPanel({
  gameId, isAlive, players, currentUserId, myVoteTargetId, voteCounts, phase, isPaused = false,
}: Props) {
  const router = useRouter()
  const [pending, setPending] = useState<string | 'ABSTAIN' | null>(null)
  const [done, setDone] = useState(myVoteTargetId !== undefined)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const alivePlayers = players.filter((p) => p.is_alive)
  const isResolution = phase === 'VOTE_RESOLUTION'

  const votedForId = myVoteTargetId !== undefined
    ? (myVoteTargetId === null ? 'ABSTAIN' : myVoteTargetId)
    : pending

  // VOTE_RESOLUTION results — always shown (even to dead players)
  if (isResolution && voteCounts) {
    const total = voteCounts.reduce((s, v) => s + v.count, 0)
    const maxVotes = Math.max(...(voteCounts.map((v) => v.count)), 0)
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 overflow-hidden animate-fade-up">
        <div className="px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <BallotBox size={32} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="font-display text-2xl tracking-wider leading-none text-red-300">Votes Tallied</p>
              <p className="text-sm text-text-muted mt-1">The village has decided.</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {voteCounts.length === 0 ? (
            <p className="text-center text-sm text-text-muted py-2">No votes were cast.</p>
          ) : (
            voteCounts.sort((a, b) => b.count - a.count).map((v) => {
              const pct = total > 0 ? (v.count / total) * 100 : 0
              const isMost = v.count === maxVotes && v.count > 0
              return (
                <div key={v.user_id} className={`space-y-1.5 p-3 rounded-xl ${isMost ? 'border border-red-800/50 bg-red-950/30 role-glow-mafia' : 'bg-surface-raised'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1.5 text-sm font-semibold ${isMost ? 'text-red-300' : 'text-text-primary'}`}>
                      {isMost && <SkullMark size={15} className="text-red-500 flex-shrink-0" />}
                      {v.display_name}
                      {isMost && <span className="ml-1 text-xs text-red-400">← most votes</span>}
                    </span>
                    <span className="text-sm font-mono font-bold text-text-muted">
                      {v.count} vote{v.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${isMost ? 'bg-red-500' : 'bg-surface-high'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // Paused — show blocked state (before dead-player check so dead players also see paused state)
  if (isPaused && !isResolution) {
    return (
      <div className="rounded-2xl border border-amber-800/40 bg-amber-950/15 p-6 text-center animate-fade-up">
        <HourglassIcon size={32} className="mx-auto mb-3 text-amber-400" />
        <p className="font-display text-xl tracking-wider text-amber-400">Game Paused</p>
        <p className="text-xs text-text-faint mt-1">Voting is disabled while the game is paused.</p>
      </div>
    )
  }

  // Dead player during active voting
  if (!isAlive) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center animate-fade-up">
        <SkullMark size={30} className="mx-auto mb-3 text-text-faint" />
        <p className="text-sm font-semibold text-text-muted">You are eliminated.</p>
        <p className="text-xs text-text-faint mt-1">Watch as the village makes its choice.</p>
      </div>
    )
  }

  function submit(targetId: string | null) {
    if (isPaused) { setError('The game is paused. Resume the game before voting.'); return }
    startTransition(async () => {
      const res = await submitVote(gameId, targetId)
      if (res.error) { setError(res.error); return }
      setDone(true)
      // Refresh so this tab picks up the new phase immediately if all votes
      // are in and voting just resolved (e.g. this was the last vote).
      router.refresh()
    })
  }

  // Submitted — waiting state
  if (done) {
    const votedName =
      votedForId === 'ABSTAIN'
        ? 'Abstain'
        : players.find((p) => p.user_id === votedForId)?.display_name ?? 'your choice'
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center animate-fade-up">
        <BallotBox size={40} className="mx-auto mb-3 text-emerald-400 animate-pop-in" />
        <p className="font-display text-xl tracking-wider text-emerald-400 mb-1">Vote Submitted</p>
        <p className="text-xs text-text-muted">
          Voted: <span className="text-text-primary font-semibold">{votedName}</span>
        </p>
        <p className="text-xs text-text-faint mt-3">Waiting for the others to decide…</p>
      </div>
    )
  }

  // Voting form — two-step: select → confirm
  const candidates = alivePlayers.filter((p) => p.user_id !== currentUserId)

  return (
    <div className="rounded-2xl border border-red-900/40 bg-red-950/15 overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <BallotBox size={32} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="font-display text-2xl tracking-wider leading-none text-red-300">The Village Votes</p>
            <p className="text-sm text-text-muted mt-1">Who is Mafia? Choose carefully.</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <p className="rounded-lg border border-red-700/40 bg-red-950/30 px-3 py-2 text-xs text-red-400 animate-shake">
            ⚠ {error}
          </p>
        )}

        {/* Candidate grid — vote cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {candidates.map((p, i) => {
            const isSelected = pending === p.user_id
            const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length]
            return (
              <button
                key={p.user_id}
                onClick={() => { setPending(p.user_id); setError(null) }}
                aria-pressed={isSelected}
                disabled={isPending}
                className={`flex flex-col items-center gap-2 rounded-xl p-4 text-sm font-semibold transition-all border ${
                  isSelected
                    ? 'border-red-600/70 text-red-300 bg-red-950/50 ring-2 ring-red-600/40 animate-vote-alarm -translate-y-0.5'
                    : 'border-border bg-surface-raised text-text-primary hover:bg-surface-high hover:border-border-bright hover:-translate-y-0.5'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`h-10 w-10 flex items-center justify-center rounded-full text-sm font-bold ${
                  isSelected ? 'bg-red-900/60 text-red-200' : avatarColor
                }`}>
                  {p.display_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-center leading-tight">{p.display_name}</span>
                {isSelected && <Check size={12} className="text-red-400 animate-pop-in" />}
              </button>
            )
          })}
        </div>

        {!pending && (
          <p className="text-center text-xs text-text-faint">
            Select a player or abstain below.
          </p>
        )}

        {/* Submit vote */}
        <button
          onClick={() => { if (pending && pending !== 'ABSTAIN') submit(pending) }}
          disabled={!pending || pending === 'ABSTAIN' || isPending}
          className={`w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold uppercase tracking-wide transition-all border ${
            pending && pending !== 'ABSTAIN' && !isPending
              ? 'border-red-500/60 bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-950/50'
              : 'border-border bg-surface text-text-faint cursor-not-allowed opacity-50'
          }`}
        >
          {isPending ? (
            <><Loader2 size={15} className="animate-spin" /> Submitting…</>
          ) : (
            <>
              Cast Vote
              {pending && pending !== 'ABSTAIN' && (
                <span className="opacity-90 normal-case">
                  — {players.find((p) => p.user_id === pending)?.display_name}
                </span>
              )}
            </>
          )}
        </button>

        {/* Abstain — secondary ghost row */}
        <button
          onClick={() => { setPending('ABSTAIN'); submit(null) }}
          disabled={isPending}
          className="w-full min-h-[44px] rounded-xl border border-transparent px-3 py-2.5 text-xs text-text-faint hover:text-text-primary hover:bg-surface-raised hover:border-border transition-all disabled:opacity-50"
        >
          Abstain — pass on this vote
        </button>
      </div>
    </div>
  )
}
