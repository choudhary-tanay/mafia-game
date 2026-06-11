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
  const [selected, setSelected] = useState<string | 'ABSTAIN' | null>(
    myVoteTargetId === null ? 'ABSTAIN' : myVoteTargetId ?? null,
  )
  const [done, setDone] = useState(myVoteTargetId !== undefined)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const alivePlayers = players.filter((p) => p.is_alive)
  const isResolution = phase === 'VOTE_RESOLUTION'

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
      setSelected(targetId === null ? 'ABSTAIN' : targetId)
      setDone(true)
    })
  }

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

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <p className="text-sm text-text-muted">
        {done ? 'Your vote has been submitted.' : 'Vote to eliminate a player, or abstain.'}
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}

      {!done && (
        <>
          <ul className="space-y-2">
            {alivePlayers
              .filter((p) => p.user_id !== currentUserId)
              .map((p) => (
                <li key={p.user_id}>
                  <button
                    onClick={() => submit(p.user_id)}
                    disabled={isPending}
                    className="w-full rounded-lg bg-surface-raised px-3 py-2.5 text-left text-sm text-text-primary hover:bg-border transition-colors"
                  >
                    {p.display_name}
                  </button>
                </li>
              ))}
          </ul>
          <Button
            variant="ghost"
            onClick={() => submit(null)}
            disabled={isPending}
            loading={isPending}
            className="w-full"
          >
            Abstain
          </Button>
        </>
      )}

      {done && selected && (
        <p className="text-sm text-green-400">
          Voted for:{' '}
          {selected === 'ABSTAIN'
            ? 'Abstain'
            : players.find((p) => p.user_id === selected)?.display_name ?? selected}
        </p>
      )}
    </div>
  )
}
