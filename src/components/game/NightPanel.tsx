'use client'

import { useState, useTransition, type ComponentType } from 'react'
import { useRouter } from 'next/navigation'
import { submitNightAction } from '@/app/actions/game'
import type { Role, PublicPlayer } from '@/types/database'
import type { NightQuestionAnswerRow } from '@/app/actions/night-question'
import NightQuestionCard from './NightQuestionCard'
import { Check, Loader2, Target, Users } from 'lucide-react'
import { MafiaMask, DoctorShield, DetectiveGlass, SkullMark, HourglassIcon } from '@/components/ui/illustrations'

type Props = {
  gameId: string
  myRole: Role
  isAlive: boolean
  players: PublicPlayer[]
  currentUserId: string
  submittedTargetId: string | null
  mafiaCurrentTarget: string | null
  mafiaTeamNames?: string[]
  isPaused?: boolean
  // Phase 9 — Night Engagement
  roundId?: string | null
  nightQuestion?: string
  myNightQuestionAnswer?: NightQuestionAnswerRow | null
}

const ROLE_CFG: Record<string, {
  label: string
  prompt: string
  Icon: ComponentType<{ className?: string; size?: number }>
  bg: string
  border: string
  accentText: string
  submitLabel: string
  glow: string
  selectedCard: string
  submitOn: string
}> = {
  MAFIA: {
    label: 'Mafia',
    prompt: 'Choose a target to eliminate tonight.',
    Icon: MafiaMask,
    bg: 'bg-red-950/30',
    border: 'border-red-900/50',
    accentText: 'text-red-400',
    submitLabel: 'Submit Mafia Target',
    glow: 'role-glow-mafia',
    selectedCard: 'border-red-500/70 text-red-300 bg-red-950/50 ring-2 ring-red-500/40 role-glow-mafia -translate-y-0.5',
    submitOn: 'border-red-500/60 bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-950/50',
  },
  DOCTOR: {
    label: 'Doctor',
    prompt: 'Choose one player to protect tonight.',
    Icon: DoctorShield,
    bg: 'bg-cyan-950/20',
    border: 'border-cyan-900/40',
    accentText: 'text-cyan-400',
    submitLabel: 'Submit Save',
    glow: 'role-glow-doctor',
    selectedCard: 'border-cyan-500/70 text-cyan-300 bg-cyan-950/50 ring-2 ring-cyan-500/40 role-glow-doctor -translate-y-0.5',
    submitOn: 'border-cyan-500/60 bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-950/50',
  },
  DETECTIVE: {
    label: 'Detective',
    prompt: 'Choose a player to investigate tonight.',
    Icon: DetectiveGlass,
    bg: 'bg-purple-950/20',
    border: 'border-purple-900/40',
    accentText: 'text-purple-400',
    submitLabel: 'Submit Investigation',
    glow: 'role-glow-detective',
    selectedCard: 'border-purple-500/70 text-purple-300 bg-purple-950/50 ring-2 ring-purple-500/40 role-glow-detective -translate-y-0.5',
    submitOn: 'border-purple-500/60 bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-950/50',
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
  mafiaTeamNames = [],
  isPaused = false,
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
      <div className="rounded-2xl border border-border bg-surface p-6 text-center animate-fade-up">
        <SkullMark size={32} className="mx-auto mb-3 text-text-faint" />
        <p className="text-sm font-semibold text-text-muted">You are eliminated.</p>
        <p className="text-xs text-text-faint mt-1">Watch and reflect on the night.</p>
      </div>
    )
  }

  // Villagers have no action — GameView renders the NightQuestionCard for them instead.
  if (myRole === 'VILLAGER') return null

  // Paused — show blocked state
  if (isPaused) {
    return (
      <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-6 text-center animate-fade-up`}>
        <HourglassIcon size={32} className="mx-auto mb-3 text-amber-400" />
        <p className="font-display text-xl tracking-wider text-amber-400">Game Paused</p>
        <p className="text-xs text-text-faint mt-1">Actions are disabled while the game is paused.</p>
      </div>
    )
  }

  // After action submitted: compact indicator + Night Question card immediately.
  if (submitted || submittedTargetId !== null) {
    return (
      <div className="space-y-3">
        {/* Compact submitted indicator */}
        <div className={`flex items-center gap-3 rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-2.5 animate-fade-up`}>
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-900/40 animate-pop-in">
            <Check size={13} className="text-emerald-400" />
          </span>
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

  const teamTargetPlayer = mafiaCurrentTarget
    ? players.find((p) => p.user_id === mafiaCurrentTarget)
    : null
  const teamTargetName = teamTargetPlayer?.display_name ?? null

  function submit() {
    if (!selected) return
    startTransition(async () => {
      const res = await submitNightAction(gameId, actionType, selected!)
      if (res.error) {
        setError(res.error)
      } else {
        setSubmitted(true)
        router.refresh()
      }
    })
  }

  return (
    <div className={`relative rounded-2xl border ${cfg.border} ${cfg.bg} ${cfg.glow} overflow-hidden animate-fade-up`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border ${cfg.border} bg-background/40`}>
            <cfg.Icon size={30} className={cfg.accentText} />
          </div>
          <div>
            <p className={`font-display text-2xl tracking-wider leading-none ${cfg.accentText}`}>{cfg.label}</p>
            <p className="text-text-primary text-sm mt-1">{cfg.prompt}</p>
          </div>
        </div>

        {/* Mafia Team Panel — private dossier */}
        {myRole === 'MAFIA' && (
          <div className="mt-4 rounded-xl border border-dashed border-red-900/60 bg-red-950/40 p-3 space-y-2.5">
            {/* Dossier header */}
            <div className="flex items-center gap-2">
              <MafiaMask size={14} className="text-red-400 flex-shrink-0" />
              <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Mafia Dossier</span>
              <span className="ml-auto rounded border border-red-800/50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-500">
                Secret
              </span>
            </div>

            {/* Teammates */}
            {mafiaTeamNames.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-text-faint mr-1">Allies:</span>
                {mafiaTeamNames.map((name) => (
                  <span
                    key={name}
                    className="flex items-center gap-1 rounded-md bg-red-900/40 border border-red-800/30 px-2 py-0.5 text-xs font-semibold text-red-300"
                  >
                    <Users size={9} />
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-red-600 italic">You are the lone Mafia. Choose carefully.</p>
            )}

            {/* Current shared target */}
            <div className="flex items-center gap-2">
              <Target size={12} className="text-red-400 flex-shrink-0" />
              {teamTargetName ? (
                <span className="text-xs text-text-muted">
                  Team target:{' '}
                  <span className="font-bold text-red-300">{teamTargetName}</span>
                </span>
              ) : (
                <span className="text-xs text-red-700 italic">No target selected yet.</span>
              )}
            </div>

            {/* Dossier footer */}
            <p className="border-t border-red-900/40 pt-2 text-[10px] uppercase tracking-widest text-red-600">
              Only Mafia can see this.
            </p>
          </div>
        )}
      </div>

      {/* Target list */}
      <div className="p-4">
        {error && (
          <p className="mb-3 rounded-lg border border-red-700/40 bg-red-950/30 px-3 py-2 text-xs text-red-400 animate-shake">
            ⚠ {error}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {targets.map((p, i) => {
            const isSelected = selected === p.user_id
            const isTeamTarget = myRole === 'MAFIA' && p.user_id === mafiaCurrentTarget
            const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length]
            return (
              <button
                key={p.user_id}
                onClick={() => { setSelected(p.user_id); setError(null) }}
                aria-pressed={isSelected}
                disabled={isPending}
                className={`relative flex flex-col items-center gap-2 rounded-xl p-4 text-sm font-semibold transition-all border ${
                  isSelected
                    ? cfg.selectedCard
                    : isTeamTarget
                    ? 'border-red-800/60 bg-red-950/30 text-red-300 ring-1 ring-red-800/30 hover:-translate-y-0.5'
                    : 'border-border bg-surface-raised text-text-primary hover:bg-surface-high hover:border-border-bright hover:-translate-y-0.5'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isTeamTarget && !isSelected && (
                  <span className="absolute top-1.5 right-1.5 text-[10px] font-bold text-red-500 uppercase tracking-wider">team</span>
                )}
                <div className={`h-10 w-10 flex items-center justify-center rounded-full text-sm font-bold ${
                  isSelected ? 'bg-current/20' : avatarColor
                }`}>
                  {p.display_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-center leading-tight">{p.display_name}</span>
                {isSelected && <Check size={12} className="opacity-80 animate-pop-in" />}
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
          className={`w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold uppercase tracking-wide transition-all border ${
            selected && !isPending
              ? cfg.submitOn
              : 'border-border bg-surface text-text-faint cursor-not-allowed opacity-50'
          }`}
        >
          {isPending ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : cfg.submitLabel}
        </button>
      </div>
    </div>
  )
}
