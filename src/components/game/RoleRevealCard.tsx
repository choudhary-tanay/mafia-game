'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { beginNight } from '@/app/actions/game'
import { getBrowserClient } from '@/lib/supabase/client'
import type { Role } from '@/types/database'
import Button from '@/components/ui/Button'
import { Play, Users, Lock } from 'lucide-react'
import { MafiaMask, DoctorShield, DetectiveGlass, VillagerGroup, MoonScene } from '@/components/ui/illustrations'

type Props = {
  role: Role
  mafiaTeammates: string[]
  players: { userId: string; name: string; isMe: boolean }[]
  gameId: string
  isHost: boolean
}

type IllustrationProps = { className?: string; size?: number }

const ROLE_CONFIG: Record<Role, {
  label: string
  Art: (props: IllustrationProps) => React.ReactNode
  tagline: string
  objective: string
  description: string
  color: string
  textColor: string
  border: string
  bg: string
  gradient: string
  button: string
  roleGlow: string
  nameGlow: string
}> = {
  MAFIA: {
    label: 'Mafia',
    Art: MafiaMask,
    tagline: 'Eliminate the village. Stay hidden.',
    objective: 'Objective: outlast the village.',
    description: 'Each night, you and your Mafia team secretly choose one player to eliminate. During the day, blend in with the village. Mislead, deflect, survive.',
    color: 'text-red-400',
    textColor: 'text-red-300',
    border: 'border-red-700/50',
    bg: 'bg-red-950/30',
    gradient: 'bg-gradient-to-b from-red-950/60 via-red-950/30 to-transparent',
    button: 'bg-red-700 hover:bg-red-600 text-white shadow-lg shadow-red-900/40',
    roleGlow: 'role-glow-mafia',
    nameGlow: 'text-glow-red',
  },
  DOCTOR: {
    label: 'Doctor',
    Art: DoctorShield,
    tagline: 'Protect one player each night.',
    objective: 'Objective: find and eliminate the Mafia.',
    description: 'Each night, choose one player to save. If the Mafia targets them, they survive. You can protect yourself — use that choice wisely.',
    color: 'text-cyan-400',
    textColor: 'text-cyan-300',
    border: 'border-cyan-700/40',
    bg: 'bg-cyan-950/20',
    gradient: 'bg-gradient-to-b from-cyan-950/50 via-cyan-950/20 to-transparent',
    button: 'bg-cyan-700 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-900/40',
    roleGlow: 'role-glow-doctor',
    nameGlow: '[text-shadow:0_0_28px_rgba(34,211,238,0.45),0_0_60px_rgba(34,211,238,0.18)]',
  },
  DETECTIVE: {
    label: 'Detective',
    Art: DetectiveGlass,
    tagline: 'Investigate and expose the hidden enemy.',
    objective: 'Objective: find and eliminate the Mafia.',
    description: 'Each night, choose a player to investigate. You will learn if they are Mafia or not. Use this knowledge carefully — the Mafia will try to silence you.',
    color: 'text-purple-400',
    textColor: 'text-purple-300',
    border: 'border-purple-700/40',
    bg: 'bg-purple-950/20',
    gradient: 'bg-gradient-to-b from-purple-950/50 via-purple-950/20 to-transparent',
    button: 'bg-purple-700 hover:bg-purple-600 text-white shadow-lg shadow-purple-900/40',
    roleGlow: 'role-glow-detective',
    nameGlow: '[text-shadow:0_0_28px_rgba(192,132,252,0.45),0_0_60px_rgba(192,132,252,0.18)]',
  },
  VILLAGER: {
    label: 'Villager',
    Art: VillagerGroup,
    tagline: 'Discuss, doubt, and vote wisely.',
    objective: 'Objective: find and eliminate the Mafia.',
    description: 'You have no night ability. Your power lies in observation, discussion, and your vote. Pay attention to who acts suspicious. Your voice matters.',
    color: 'text-emerald-400',
    textColor: 'text-emerald-300',
    border: 'border-emerald-700/40',
    bg: 'bg-emerald-950/20',
    gradient: 'bg-gradient-to-b from-emerald-950/50 via-emerald-950/20 to-transparent',
    button: 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/40',
    roleGlow: 'role-glow-villager',
    nameGlow: '[text-shadow:0_0_28px_rgba(52,211,153,0.45),0_0_60px_rgba(52,211,153,0.18)]',
  },
}

export default function RoleRevealCard({ role, mafiaTeammates, players, gameId, isHost }: Props) {
  const [acknowledged, setAcknowledged] = useState(false)
  const router = useRouter()
  const cfg = ROLE_CONFIG[role]
  const Art = cfg.Art

  // Always poll/subscribe so the page swaps to GameView once Night 1 begins
  useEffect(() => {
    const supabase = getBrowserClient()
    const channel = supabase
      .channel(`game:${gameId}`)
      .on('broadcast', { event: 'phase_changed' }, () => router.refresh())
      .subscribe()
    const id = window.setInterval(() => router.refresh(), 3000)
    return () => {
      supabase.removeChannel(channel)
      window.clearInterval(id)
    }
  }, [gameId, router])

  if (!acknowledged) {
    return (
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 vignette">
        {/* Atmosphere */}
        <div className="fog-layer" aria-hidden="true" />
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_20%,var(--accent-glow),transparent)]" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Role card */}
          <div
            className={`relative rounded-3xl border-2 ${cfg.border} ${cfg.bg} overflow-hidden shadow-2xl ${cfg.roleGlow} animate-flip-in`}
          >
            {/* Gradient top */}
            <div className={`absolute inset-x-0 top-0 h-44 ${cfg.gradient} pointer-events-none`} />

            {/* Content */}
            <div className="relative px-8 py-10 text-center">
              {/* Preamble */}
              <p className={`text-xs font-bold uppercase tracking-[0.3em] ${cfg.textColor} mb-7 opacity-80`}>
                Your secret role
              </p>

              {/* Role illustration */}
              <div className={`mb-5 flex justify-center ${cfg.color} animate-float`}>
                <Art size={84} className="drop-shadow-[0_0_24px_currentColor]" />
              </div>

              {/* Role name */}
              <h1 className={`font-display text-6xl sm:text-7xl leading-none tracking-wide mb-3 ${cfg.color} ${cfg.nameGlow}`}>
                {cfg.label}
              </h1>

              {/* Tagline */}
              <p className={`text-base font-semibold mb-1.5 ${cfg.textColor}`}>
                {cfg.tagline}
              </p>

              {/* Team objective */}
              <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${cfg.color} opacity-90`}>
                {cfg.objective}
              </p>

              {/* Divider */}
              <div className={`my-6 h-px bg-gradient-to-r from-transparent via-current to-transparent ${cfg.color} opacity-20`} />

              {/* Description */}
              <p className="text-sm text-text-muted leading-relaxed mb-6 max-w-xs mx-auto">
                {cfg.description}
              </p>

              {/* Mafia teammates */}
              {role === 'MAFIA' && (
                <div className={`mb-6 rounded-xl border ${cfg.border} ${cfg.bg} p-4 text-left`}>
                  <p className={`text-xs font-bold uppercase tracking-wider ${cfg.color} mb-3`}>
                    Your Mafia team
                  </p>
                  {mafiaTeammates.length === 0 ? (
                    <p className="text-sm text-text-muted italic">You are the lone Mafia. Choose carefully.</p>
                  ) : (
                    <div className="space-y-2">
                      {mafiaTeammates.map((name) => (
                        <div key={name} className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-red-900/60 flex items-center justify-center text-xs font-bold text-red-200">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-red-300">{name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Privacy note */}
              <p className="mb-6 flex items-center justify-center gap-1.5 text-xs text-text-faint">
                <Lock size={11} aria-hidden="true" />
                Keep your role secret. Never share this screen.
              </p>

              {/* Acknowledge button */}
              <button
                onClick={() => setAcknowledged(true)}
                className={`w-full rounded-2xl py-4 min-h-[44px] text-base font-black text-white transition-all ${cfg.button}`}
              >
                I understand my role
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Waiting screen after acknowledging
  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface/90 backdrop-blur-sm px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="font-display text-xl tracking-wider text-text-primary">Mafia</span>
          <div className={`flex items-center gap-2 rounded-full border ${cfg.border} ${cfg.bg} px-4 py-1.5 ${cfg.color}`}>
            <Art size={16} />
            <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden px-4 py-8 sm:py-12 vignette">
        <div className="fog-layer" aria-hidden="true" />
        <div className="relative mx-auto max-w-2xl space-y-6">

          {/* Status */}
          <div className={`relative overflow-hidden rounded-2xl border ${cfg.border} ${cfg.bg} p-6 text-center animate-fade-up`}>
            <div className="mb-4 flex justify-center text-blue-300 animate-float">
              <MoonScene size={48} className="drop-shadow-[0_0_18px_currentColor]" />
            </div>
            <h1 className="font-display text-3xl tracking-wide text-text-primary mb-2">
              Waiting to begin
            </h1>
            <p className="text-sm text-text-muted">
              All players have received their roles.
            </p>
            {isHost ? (
              <div className="mt-5">
                <p className="text-xs text-text-faint mb-3">
                  You are the host. Begin Night 1 when everyone is ready.
                </p>
                <form action={beginNight.bind(null, gameId)}>
                  <Button type="submit" className="px-8 py-3 min-h-[44px] font-bold text-base animate-breathe">
                    <Play size={16} />
                    Start The Night
                  </Button>
                </form>
              </div>
            ) : (
              <div className="mt-5 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400/60 animate-pulse" />
                <p className="text-xs text-text-muted">Waiting for the host to begin…</p>
              </div>
            )}
          </div>

          {/* Player list */}
          <div className="rounded-xl border border-border bg-surface/80 backdrop-blur-sm p-5 animate-fade-up stagger-2">
            <div className="flex items-center gap-2 mb-4">
              <Users size={15} className="text-text-muted" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-text-muted">
                Players this game
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {players.map((p, i) => {
                const colors = [
                  'bg-red-900/50 text-red-300', 'bg-purple-900/50 text-purple-300',
                  'bg-cyan-900/50 text-cyan-300', 'bg-emerald-900/50 text-emerald-300',
                  'bg-amber-900/50 text-amber-300', 'bg-blue-900/50 text-blue-300',
                ]
                return (
                  <div
                    key={p.userId}
                    className={`flex items-center gap-2.5 rounded-xl p-3 animate-pop-in stagger-${Math.min(i + 1, 8)} ${
                      p.isMe ? 'border border-accent/30 bg-accent/5' : 'bg-surface-raised'
                    }`}
                  >
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${colors[i % colors.length]}`}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate text-text-primary">{p.name}</p>
                      {p.isMe && <p className="text-[10px] text-accent">you</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
