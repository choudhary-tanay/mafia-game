'use client'

import { useState } from 'react'
import type { Role, GamePhase } from '@/types/database'

type Props = {
  role: Role
  mafiaTeammates: string[]
  players: { name: string; isMe: boolean }[]
  phase: GamePhase
}

const ROLE_CONFIG: Record<
  Role,
  { label: string; symbol: string; color: string; border: string; bg: string; instructions: string }
> = {
  MAFIA: {
    label: 'Mafia',
    symbol: '🔴',
    color: 'text-red-400',
    border: 'border-red-600/50',
    bg: 'bg-red-950/20',
    instructions:
      'Each night, you and your Mafia team secretly choose one player to eliminate. During the day, blend in with the village. Your goal: equal or outnumber the innocent.',
  },
  DOCTOR: {
    label: 'Doctor',
    symbol: '💊',
    color: 'text-blue-400',
    border: 'border-blue-600/50',
    bg: 'bg-blue-950/20',
    instructions:
      'Each night, choose one player to protect. If the Mafia targets your chosen player, they survive. You may protect yourself, but use that wisely.',
  },
  DETECTIVE: {
    label: 'Detective',
    symbol: '🔍',
    color: 'text-purple-400',
    border: 'border-purple-600/50',
    bg: 'bg-purple-950/20',
    instructions:
      'Each night, investigate one player. You will learn whether they are Mafia or not. Use your knowledge carefully — the Mafia will try to silence you.',
  },
  VILLAGER: {
    label: 'Villager',
    symbol: '👤',
    color: 'text-green-400',
    border: 'border-green-600/50',
    bg: 'bg-green-950/20',
    instructions:
      'You have no night ability. Your power is observation, discussion, and your vote. Watch for suspicious behaviour and help the village eliminate the Mafia.',
  },
}

export default function RoleRevealCard({ role, mafiaTeammates, players, phase }: Props) {
  const [acknowledged, setAcknowledged] = useState(false)
  const cfg = ROLE_CONFIG[role]

  if (!acknowledged) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div
          className={`w-full max-w-md rounded-2xl border-2 ${cfg.border} ${cfg.bg} p-8 shadow-2xl`}
        >
          {/* Header */}
          <div className="mb-6 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
              Your secret role
            </p>
            <div className="mb-3 text-5xl">{cfg.symbol}</div>
            <h1 className={`text-4xl font-bold tracking-tight ${cfg.color}`}>{cfg.label}</h1>
          </div>

          {/* Divider */}
          <div className={`mb-6 h-px ${cfg.border.replace('/50', '/30')} bg-current opacity-20`} />

          {/* Instructions */}
          <p className="mb-6 text-center text-sm leading-relaxed text-text-muted">
            {cfg.instructions}
          </p>

          {/* Mafia team — only rendered for Mafia players */}
          {role === 'MAFIA' && (
            <div className="mb-6 rounded-xl border border-red-600/30 bg-red-950/30 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-400">
                Your Mafia team
              </p>
              {mafiaTeammates.length === 0 ? (
                <p className="text-sm text-text-muted">You are the only Mafia.</p>
              ) : (
                <ul className="space-y-1">
                  {mafiaTeammates.map((name) => (
                    <li key={name} className="text-sm font-medium text-red-300">
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Acknowledge button */}
          <button
            onClick={() => setAcknowledged(true)}
            className={`w-full rounded-lg py-3 text-sm font-semibold transition-colors
              bg-${role === 'MAFIA' ? 'red' : role === 'DOCTOR' ? 'blue' : role === 'DETECTIVE' ? 'purple' : 'green'}-600
              hover:bg-${role === 'MAFIA' ? 'red' : role === 'DOCTOR' ? 'blue' : role === 'DETECTIVE' ? 'purple' : 'green'}-500
              text-white`}
          >
            I understand my role
          </button>

          <p className="mt-3 text-center text-xs text-text-muted">
            Keep your role secret. Do not share this screen.
          </p>
        </div>
      </div>
    )
  }

  // ── Waiting screen (after acknowledging role) ─────────────────────────────
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-lg font-bold text-text-primary">Mafia</span>
          <div
            className={`flex items-center gap-2 rounded-full border ${cfg.border} ${cfg.bg} px-3 py-1`}
          >
            <span className="text-sm">{cfg.symbol}</span>
            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-10">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Phase: {phase.replace(/_/g, ' ')}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-text-primary">
              All players have received their roles
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              The game engine launches in Phase 4. For now, this is a placeholder.
            </p>
          </div>

          {/* Player list — names only, no roles shown */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-muted">
              Players in this game
            </h2>
            <ul className="space-y-2">
              {players.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center gap-3 rounded-lg bg-surface-raised px-3 py-2.5"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-sm font-bold text-text-muted">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm text-text-primary">{p.name}</span>
                  {p.isMe && <span className="text-xs text-text-muted">(you)</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center text-sm text-amber-400">
            Night/Day game loop, voting, and win detection coming in Phase 4.
          </div>
        </div>
      </main>
    </div>
  )
}
