'use client'

import { useState, useTransition } from 'react'
import { submitNightAction } from '@/app/actions/game'
import type { Role, PublicPlayer } from '@/types/database'
import Button from '@/components/ui/Button'

type Props = {
  gameId: string
  myRole: Role
  isAlive: boolean
  players: PublicPlayer[]
  currentUserId: string
  submittedTargetId: string | null
  mafiaCurrentTarget: string | null
}

const SUBMIT_LABEL: Record<string, string> = {
  MAFIA:      'Submit Mafia Target',
  DOCTOR:     'Submit Save',
  DETECTIVE:  'Submit Investigation',
}

const PROMPT: Record<string, string> = {
  MAFIA:     'Choose a player to eliminate tonight.',
  DOCTOR:    'Choose a player to protect tonight.',
  DETECTIVE: 'Choose a player to investigate tonight.',
}

export default function NightPanel({
  gameId, myRole, isAlive, players, currentUserId, submittedTargetId, mafiaCurrentTarget,
}: Props) {
  const [selected, setSelected]   = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(submittedTargetId !== null)
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const alivePlayers = players.filter((p) => p.is_alive)
  const targets = myRole === 'MAFIA'
    ? alivePlayers.filter((p) => p.user_id !== currentUserId)
    : alivePlayers

  if (!isAlive) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-text-muted">
        You are dead. Watch in silence.
      </div>
    )
  }

  if (myRole === 'VILLAGER') {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-center">
        <p className="text-sm text-text-muted">You have no night action.</p>
        <p className="mt-1 text-xs text-text-muted">Villagers wait for morning.</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-600/30 bg-green-950/20 p-5 text-center space-y-1">
        <p className="text-sm font-semibold text-green-400">✓ Action submitted</p>
        <p className="text-xs text-text-muted">Waiting for other night actions…</p>
      </div>
    )
  }

  const actionType =
    myRole === 'MAFIA' ? 'MAFIA_KILL' : myRole === 'DOCTOR' ? 'DOCTOR_SAVE' : 'DETECTIVE_CHECK'

  // Show current Mafia team target (for Mafia players)
  const teamTargetName = mafiaCurrentTarget
    ? (players.find((p) => p.user_id === mafiaCurrentTarget)?.display_name ?? 'Unknown')
    : null

  function submit() {
    if (!selected) return
    startTransition(async () => {
      const res = await submitNightAction(gameId, actionType, selected!)
      if (res.error) {
        setError(res.error)
      } else {
        setSubmitted(true)
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      {/* Prompt */}
      <div>
        <p className="text-sm font-medium text-text-primary">{PROMPT[myRole]}</p>
        {myRole === 'MAFIA' && teamTargetName && (
          <p className="mt-1 text-xs text-text-muted">
            Current team target: <span className="text-red-400 font-semibold">{teamTargetName}</span>
          </p>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Player list */}
      <ul className="space-y-2">
        {targets.map((p) => (
          <li key={p.user_id}>
            <button
              onClick={() => { setSelected(p.user_id); setError(null) }}
              disabled={isPending}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                selected === p.user_id
                  ? 'bg-accent text-white ring-2 ring-accent/50'
                  : 'bg-surface-raised text-text-primary hover:bg-border'
              }`}
            >
              {p.display_name}
            </button>
          </li>
        ))}
      </ul>

      {/* Submit */}
      {!selected && (
        <p className="text-center text-xs text-text-muted">Select a player to continue.</p>
      )}

      <Button
        onClick={submit}
        disabled={!selected || isPending}
        loading={isPending}
        className="w-full"
      >
        {SUBMIT_LABEL[myRole] ?? 'Submit'}
      </Button>
    </div>
  )
}
