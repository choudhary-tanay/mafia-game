'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitNightAction } from '@/app/actions/game'
import type { Role, PublicPlayer } from '@/types/database'
import type { NightQuestionAnswerRow } from '@/app/actions/night-question'
import NightQuestionCard from './NightQuestionCard'
import { Check, Loader2, Skull, Target } from 'lucide-react'

type Props = {
  gameId: string
  myRole: Role
  isAlive: boolean
  players: PublicPlayer[]
  currentUserId: string
  submittedTargetId: string | null
  mafiaCurrentTarget: string | null
  // Phase 9 — Night Engagement
  roundId?: string | null
  nightQuestion?: string
  myNightQuestionAnswer?: NightQuestionAnswerRow | null
}

const ROLE_CFG: Record<string, {
  label: string
  prompt: string
  icon: string
  bg: string
  border: string
  accentText: string
  submitLabel: string
}> = {
  MAFIA: {
    label: 'Mafia',
    prompt: 'Choose a target to eliminate tonight.',
    icon: '🔴',
    bg: 'bg-red-950/30',
    border: 'border-red-900/50',
    accentText: 'text-red-400',
    submitLabel: 'Submit Mafia Target',
  },
  DOCTOR: {
    label: 'Doctor',
    prompt: 'Choose one player to protect tonight.',
    icon: '💊',
    bg: 'bg-cyan-950/20',
    border: 'border-cyan-900/40',
    accentText: 'text-cyan-400',
    submitLabel: 'Submit Save',
  },
  DETECTIVE: {
    label: 'Detective',
    prompt: 'Choose a player to investigate tonight.',
    icon: '🔍',
    bg: 'bg-purple-950/20',
    border: 'border-purple-900/40',
    accentText: 'text-purple-400',
    submitLabel: 'Submit Investigation',
  },
}

const AVATAR_COLORS = [
  'bg-red-900/50 text-red-300',
  'bg-purple-900/50 text-purple-300',
  'bg-cyan-900/50 text-cyan-300',
  'bg-emerald-900/50 text-emerald-300',
  'bg-amber-900/50 text-amber-300',
  'bg-blue-900/50 text-blue-300',
  'bg-pink-900/50 text-pink-300',
  'bg-indigo-900/50 text-indigo-300',
]

export default function NightPanel({
  gameId, myRole, isAlive, players, currentUserId, submittedTargetId, mafiaCurrentTarget,
  roundId, nightQuestion, myNightQuestionAnswer,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(submittedTargetId !== null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const cfg = ROLE_CFG[myRole]
  const alivePlayers = players.filter((p) => p.is_alive)
  const targets = myRole === 'MAFIA'
    ? alivePlayers.filter((p) => p.user_id !== currentUserId)
    : alivePlayers

  if (!isAlive) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <Skull size={24} className="mx-auto mb-3 text-text-faint" />
        <p className="text-sm font-semibold text-text-muted">You are eliminated.</p>
        <p className="text-xs text-text-faint mt-1">Watch and reflect on the night.</p>
      </div>
    )
  }

  // Villagers have no action — GameView renders the NightQuestionCard for them instead.
  if (myRole === 'VILLAGER') return null

  // After action submitted: compact indicator + Night Question card immediately.
  // Using local `submitted` state (not server props) so there's no refresh delay.
  if (submitted || submittedTargetId !== null) {
    return (
      <div className="space-y-3">
        {/* Compact submitted indicator */}
        <div className={`flex items-center gap-3 rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-2.5`}>
          <Check size={15} className="text-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-emerald-400">Action submitted</span>
            <span className="text-xs text-text-faint ml-2">Waiting for night to end…</span>
          </div>
        </div>
        {/* Night engagement question — shown immediately after action */}
        {roundId && nightQuestion && (
          <NightQuestionCard
            gameId={gameId}
            roundId={roundId}
            question={nightQuestion}
            existingAnswer={myNightQuestionAnswer}
          />
        )}
      </div>
    )
  }

  const actionType =
    myRole === 'MAFIA' ? 'MAFIA_KILL' : myRole === 'DOCTOR' ? 'DOCTOR_SAVE' : 'DETECTIVE_CHECK'

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
        // Refresh so this tab picks up the new phase if night resolved after
        // this action (e.g. this was the last required action).
        router.refresh()
      }
    })
  }

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{cfg.icon}</span>
          <div>
            <p className={`font-bold text-sm uppercase tracking-wider ${cfg.accentText}`}>{cfg.label}</p>
            <p className="text-text-primary text-sm mt-0.5">{cfg.prompt}</p>
          </div>
        </div>
        {myRole === 'MAFIA' && teamTargetName && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-950/40 border border-red-900/40 px-3 py-2">
            <Target size={13} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-text-muted">
              Team target: <span className="text-red-300 font-bold">{teamTargetName}</span>
            </p>
          </div>
        )}
      </div>

      {/* Target list */}
      <div className="p-4">
        {error && (
          <p className="mb-3 rounded-lg border border-red-700/40 bg-red-950/30 px-3 py-2 text-xs text-red-400">
            ⚠ {error}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {targets.map((p, i) => {
            const isSelected = selected === p.user_id
            const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length]
            return (
              <button
                key={p.user_id}
                onClick={() => { setSelected(p.user_id); setError(null) }}
                disabled={isPending}
                className={`flex flex-col items-center gap-2 rounded-xl p-4 text-sm font-semibold transition-all border ${
                  isSelected
                    ? `${cfg.border} ${cfg.accentText} bg-surface-high ring-2 ring-current/30 scale-105`
                    : 'border-border bg-surface-raised text-text-primary hover:bg-surface-high hover:border-border-bright hover:scale-102'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`h-10 w-10 flex items-center justify-center rounded-full text-sm font-bold ${
                  isSelected ? 'bg-current/20' : avatarColor
                }`}>
                  {p.display_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-center leading-tight">{p.display_name}</span>
                {isSelected && <Check size={12} className="opacity-80" />}
              </button>
            )
          })}
        </div>

        {!selected && (
          <p className="text-center text-xs text-text-faint mb-3">
            Select a player to continue.
          </p>
        )}

        <button
          onClick={submit}
          disabled={!selected || isPending}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all border ${
            selected && !isPending
              ? `${cfg.border} ${cfg.bg} ${cfg.accentText} hover:opacity-80`
              : 'border-border bg-surface text-text-faint cursor-not-allowed opacity-50'
          }`}
        >
          {isPending ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : cfg.submitLabel}
        </button>
      </div>
    </div>
  )
}
