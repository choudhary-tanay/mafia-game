'use client'

import { useState, useTransition } from 'react'
import { submitVote } from '@/app/actions/game'
import type { PublicPlayer } from '@/types/database'
import Button from '@/components/ui/Button'

type VoteCount = { user_id: string; display_name: string; count: number }

type Props = {
  gameId: string
  isAlive: boolean
  players: PublicPlayer[]
  currentUserId: string
  myVoteTargetId: string | null | undefined  // undefined = not voted yet
  voteCounts?: VoteCount[]
  phase: string
}

export default function VotingPanel({
  gameId, isAlive, players, currentUserId, myVoteTargetId, voteCounts, phase,
}: Props) {
  // pending = what the player selected but hasn't submitted yet
  const [pending,    setPending]    = useState<string | 'ABSTAIN' | null>(null)
  // done = whether the vote has been submitted (either pre-set from server or just submitted)
  const [done,       setDone]       = useState(myVoteTargetId !== undefined)
  const [error,      setError]      = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const alivePlayers = players.filter((p) => p.is_alive)
  const isResolution = phase === 'VOTE_RESOLUTION'

  // The final voted-for name (from server or local state)
  const votedForId = myVoteTargetId !== undefined
    ? (myVoteTargetId === null ? 'ABSTAIN' : myVoteTargetId)
    : pending

  if (!isAlive) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-text-muted">
        You are dead. Watch in silence.
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

  // Results view (after vote resolution)
  if (isResolution && voteCounts) {
    const total = voteCounts.reduce((s, v) => s + v.count, 0)
    return (
      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">Vote results</h3>
        {voteCounts.map((v) => (
          <div key={v.user_id} className="flex items-center gap-3">
            <span className="flex-1 text-sm text-text-primary">{v.display_name}</span>
            <div className="h-2 rounded-full bg-surface-raised flex-1 max-w-24">
              <div
                className="h-2 rounded-full bg-accent"
                style={{ width: total > 0 ? `${(v.count / total) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-xs text-text-muted w-4 text-right">{v.count}</span>
          </div>
        ))}
      </div>
    )
  }

  // Submitted — waiting for others
  if (done) {
    const votedName =
      votedForId === 'ABSTAIN'
        ? 'Abstain'
        : players.find((p) => p.user_id === votedForId)?.display_name ?? 'your target'
    return (
      <div className="rounded-xl border border-green-600/30 bg-green-950/20 p-5 text-center space-y-1">
        <p className="text-sm font-semibold text-green-400">✓ Vote submitted</p>
        <p className="text-xs text-text-muted">
          Voted for: <span className="font-medium text-text-primary">{votedName}</span>
        </p>
        <p className="text-xs text-text-muted">Waiting for others…</p>
      </div>
    )
  }

  // Voting form — two-step: select → submit
  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <p className="text-sm text-text-muted">Vote to eliminate a player, or abstain.</p>
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Candidate list — click to select */}
      <ul className="space-y-2">
        {alivePlayers
          .filter((p) => p.user_id !== currentUserId)
          .map((p) => (
            <li key={p.user_id}>
              <button
                onClick={() => { setPending(p.user_id); setError(null) }}
                disabled={isPending}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                  pending === p.user_id
                    ? 'bg-accent text-white ring-2 ring-accent/50'
                    : 'bg-surface-raised text-text-primary hover:bg-border'
                }`}
              >
                {p.display_name}
              </button>
            </li>
          ))}
      </ul>

      {/* Instruction before selection */}
      {!pending && (
        <p className="text-center text-xs text-text-muted">Select a player to continue, or abstain below.</p>
      )}

      {/* Submit vote button — enabled only when a player is selected */}
      <Button
        onClick={() => { if (pending && pending !== 'ABSTAIN') submit(pending) }}
        disabled={!pending || pending === 'ABSTAIN' || isPending}
        loading={isPending}
        className="w-full"
      >
        Cast Vote
        {pending && pending !== 'ABSTAIN' && (
          <span className="ml-1 opacity-80">
            — {players.find((p) => p.user_id === pending)?.display_name}
          </span>
        )}
      </Button>

      {/* Abstain — direct single-click action */}
      <button
        onClick={() => { setPending('ABSTAIN'); submit(null) }}
        disabled={isPending}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:text-text-primary hover:border-text-muted transition-colors disabled:opacity-50"
      >
        Abstain
      </button>
    </div>
  )
}
