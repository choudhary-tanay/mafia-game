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

export default function NightPanel({
  gameId, myRole, isAlive, players, currentUserId, submittedTargetId, mafiaCurrentTarget,
}: Props) {
  const [selected, setSelected] = useState<string | null>(submittedTargetId)
  const [result, setResult] = useState<string | null>(null)
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

  const actionType =
    myRole === 'MAFIA' ? 'MAFIA_KILL' : myRole === 'DOCTOR' ? 'DOCTOR_SAVE' : 'DETECTIVE_CHECK'

  const prompt =
    myRole === 'MAFIA'
      ? `Choose a player to eliminate. Team target: ${mafiaCurrentTarget
          ? (players.find((p) => p.user_id === mafiaCurrentTarget)?.display_name ?? 'Unknown')
          : 'none yet'}`
      : myRole === 'DOCTOR'
      ? 'Choose a player to protect tonight.'
      : 'Choose a player to investigate.'

  function submit() {
    if (!selected) return
    startTransition(async () => {
      const res = await submitNightAction(gameId, actionType, selected!)
      if (res.error) setResult(res.error)
      else setResult(
        myRole === 'MAFIA' ? 'Target locked in.' :
        myRole === 'DOCTOR' ? 'Protection submitted.' :
        'Investigation submitted.'
      )
    })
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <p className="text-sm text-text-muted">{prompt}</p>

      {result && (
        <p className={`text-sm ${result.includes('error') || result.includes('cannot') ? 'text-red-400' : 'text-green-400'}`}>
          {result}
        </p>
      )}

      <ul className="space-y-2">
        {targets.map((p) => (
          <li key={p.user_id}>
            <button
              onClick={() => setSelected(p.user_id)}
              disabled={!!result && !result.includes('error')}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors
                ${selected === p.user_id
                  ? 'bg-accent text-white'
                  : 'bg-surface-raised text-text-primary hover:bg-border'
                }`}
            >
              {p.display_name}
              {p.user_id === currentUserId && <span className="ml-2 text-xs opacity-60">(you)</span>}
            </button>
          </li>
        ))}
      </ul>

      {!result && (
        <Button
          onClick={submit}
          disabled={!selected || isPending}
          loading={isPending}
          className="w-full"
        >
          Confirm
        </Button>
      )}
    </div>
  )
}
