'use client'

import { useState, useTransition } from 'react'
import { submitVote } from '@/app/actions/game'
import type { PublicPlayer } from '@/types/database'
import { Check, Skull, Loader2 } from 'lucide-react'

type VoteCount = { user_id: string; display_name: string; count: number }

type Props = {
  gameId: string
  isAlive: boolean
  players: PublicPlayer[]
  currentUserId: string
  myVoteTargetId: string | null | undefined
  voteCounts?: VoteCount[]
  phase: string
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
  gameId, isAlive, players, currentUserId, myVoteTargetId, voteCounts, phase,
}: Props) {
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
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-red-300">Votes tallied</p>
              <p className="text-sm text-text-primary font-semibold">The village has decided.</p>
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
                <div key={v.user_id} className={`space-y-1.5 p-3 rounded-xl ${isMost ? 'border border-red-800/50 bg-red-950/30' : 'bg-surface-raised'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${isMost ? 'text-red-300' : 'text-text-primary'}`}>
                      {v.display_name}
                      {isMost && <span className="ml-2 text-xs text-red-400">← most votes</span>}
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

  // Dead player during active voting
  if (!isAlive) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <Skull size={22} className="mx-auto mb-3 text-text-faint" />
        <p className="text-sm font-semibold text-text-muted">You are eliminated.</p>
        <p className="text-xs text-text-faint mt-1">Watch as the village makes its choice.</p>
      </div>
    )
  }

  function submit(targetId: string | null) {
    startTransition(async () => {
      const res = await submitVote(gameId, targetId)
      if (res.error) { setError(res.error); return }
      setDone(true)
    })
  }

  // Submitted — waiting state
  if (done) {
    const votedName =
      votedForId === 'ABSTAIN'
        ? 'Abstain'
        : players.find((p) => p.user_id === votedForId)?.display_name ?? 'your choice'
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-900/40">
            <Check size={20} className="text-emerald-400" />
          </div>
        </div>
        <p className="text-sm font-bold text-emerald-400 mb-1">Vote submitted</p>
        <p className="text-xs text-text-muted">
          Voted: <span className="text-text-primary font-semibold">{votedName}</span>
        </p>
        <p className="text-xs text-text-faint mt-3">Waiting for others to vote…</p>
      </div>
    )
  }

  // Voting form — two-step: select → confirm
  const candidates = alivePlayers.filter((p) => p.user_id !== currentUserId)

  return (
    <div className="rounded-2xl border border-red-900/40 bg-red-950/15 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗳️</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-red-300">Voting</p>
            <p className="text-sm font-semibold text-text-primary">Who is Mafia? Choose carefully.</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <p className="rounded-lg border border-red-700/40 bg-red-950/30 px-3 py-2 text-xs text-red-400">
            ⚠ {error}
          </p>
        )}

        {/* Candidate grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {candidates.map((p, i) => {
            const isSelected = pending === p.user_id
            const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length]
            return (
              <button
                key={p.user_id}
                onClick={() => { setPending(p.user_id); setError(null) }}
                disabled={isPending}
                className={`flex flex-col items-center gap-2 rounded-xl p-4 text-sm font-semibold transition-all border ${
                  isSelected
                    ? 'border-red-700/60 text-red-300 bg-red-950/40 ring-2 ring-red-700/30 scale-105'
                    : 'border-border bg-surface-raised text-text-primary hover:bg-surface-high hover:border-border-bright hover:scale-102'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`h-10 w-10 flex items-center justify-center rounded-full text-sm font-bold ${
                  isSelected ? 'bg-red-900/60 text-red-200' : avatarColor
                }`}>
                  {p.display_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-center leading-tight">{p.display_name}</span>
                {isSelected && <Check size={12} className="text-red-400" />}
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
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all border ${
            pending && pending !== 'ABSTAIN' && !isPending
              ? 'border-red-700/60 bg-red-950/40 text-red-200 hover:bg-red-950/60'
              : 'border-border bg-surface text-text-faint cursor-not-allowed opacity-50'
          }`}
        >
          {isPending ? (
            <><Loader2 size={15} className="animate-spin" /> Submitting…</>
          ) : (
            <>
              Cast Vote
              {pending && pending !== 'ABSTAIN' && (
                <span className="opacity-75">
                  — {players.find((p) => p.user_id === pending)?.display_name}
                </span>
              )}
            </>
          )}
        </button>

        {/* Abstain */}
        <button
          onClick={() => { setPending('ABSTAIN'); submit(null) }}
          disabled={isPending}
          className="w-full rounded-xl border border-border px-3 py-2.5 text-xs text-text-muted hover:text-text-primary hover:bg-surface-raised hover:border-border-bright transition-all disabled:opacity-50"
        >
          Abstain — pass on this vote
        </button>
      </div>
    </div>
  )
}
