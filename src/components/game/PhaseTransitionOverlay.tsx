'use client'

import { useEffect, useState } from 'react'
import type { GamePhase } from '@/types/database'
import { Sun, Scale } from 'lucide-react'
import { MoonScene, BallotBox, TrophyIcon } from '@/components/ui/illustrations'

type PhaseCfg = {
  art: React.ReactNode
  title: string
  subtitle: string
  bg: string
  titleColor: string
  titleGlow: string
  subtitleColor: string
}

const PHASE_CFG: Partial<Record<GamePhase, PhaseCfg>> = {
  NIGHT_ACTIONS_OPEN: {
    art: <MoonScene size={88} className="drop-shadow-[0_0_36px_currentColor]" />,
    title: 'Night Falls',
    subtitle: 'The village sleeps. Hidden roles make their move.',
    bg: 'from-blue-950/95 via-indigo-950/90 to-background',
    titleColor: 'text-blue-200',
    titleGlow: 'text-glow-blue',
    subtitleColor: 'text-blue-400',
  },
  DISCUSSION: {
    art: <Sun size={80} strokeWidth={1.5} className="drop-shadow-[0_0_36px_currentColor]" aria-hidden="true" />,
    title: 'Morning Arrives',
    subtitle: 'The village wakes to discover what happened.',
    bg: 'from-amber-950/95 via-orange-950/90 to-background',
    titleColor: 'text-amber-200',
    titleGlow: 'text-glow-gold',
    subtitleColor: 'text-amber-400',
  },
  VOTING: {
    art: <BallotBox size={84} className="drop-shadow-[0_0_36px_currentColor]" />,
    title: 'Voting Time',
    subtitle: 'Choose carefully. The village will decide.',
    bg: 'from-red-950/95 via-rose-950/90 to-background',
    titleColor: 'text-red-200',
    titleGlow: 'text-glow-red',
    subtitleColor: 'text-red-400',
  },
  VOTE_RESOLUTION: {
    art: <Scale size={76} strokeWidth={1.5} className="drop-shadow-[0_0_36px_currentColor]" aria-hidden="true" />,
    title: 'Votes Are In',
    subtitle: 'The village has spoken.',
    bg: 'from-red-950/95 via-background to-background',
    titleColor: 'text-red-200',
    titleGlow: 'text-glow-red',
    subtitleColor: 'text-red-400',
  },
  GAME_OVER: {
    art: <TrophyIcon size={84} className="drop-shadow-[0_0_36px_currentColor]" />,
    title: 'Game Over',
    subtitle: 'The dust has settled.',
    bg: 'from-background via-background to-background',
    titleColor: 'text-gold',
    titleGlow: 'text-glow-gold',
    subtitleColor: 'text-text-muted',
  },
}

const SHOW_DURATION_MS = 2200

export default function PhaseTransitionOverlay({ phase }: { phase: GamePhase }) {
  const [prevPhase, setPrevPhase] = useState<GamePhase>(phase)
  const [visible, setVisible] = useState(false)
  const [displayCfg, setDisplayCfg] = useState<PhaseCfg | null>(null)

  // Respect prefers-reduced-motion
  const prefersReduced =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  // Adjust state when the phase prop changes (during render, per React docs)
  if (prevPhase !== phase) {
    setPrevPhase(phase)
    const cfg = PHASE_CFG[phase]
    if (cfg && !prefersReduced) {
      setDisplayCfg(cfg)
      setVisible(true)
    }
  }

  useEffect(() => {
    if (!visible || !displayCfg) return
    const t = setTimeout(() => setVisible(false), SHOW_DURATION_MS)
    return () => clearTimeout(t)
  }, [visible, displayCfg])

  if (!visible || !displayCfg) return null

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center overflow-hidden pointer-events-none vignette bg-gradient-to-b ${displayCfg.bg} animate-fade-in`}
    >
      {/* Drifting fog */}
      <div className="fog-layer" aria-hidden="true" />

      {/* Fade-out overlay at the bottom to blend with page */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />

      <div className="relative text-center px-8 animate-fade-up">
        <div className={`mb-6 flex justify-center ${displayCfg.titleColor} animate-scale-in`}>
          {displayCfg.art}
        </div>
        <h2 className={`font-display text-6xl sm:text-7xl leading-none tracking-wide mb-4 ${displayCfg.titleColor} ${displayCfg.titleGlow}`}>
          {displayCfg.title}
        </h2>
        <p className={`text-lg font-medium max-w-sm mx-auto leading-relaxed ${displayCfg.subtitleColor} animate-fade-up stagger-3`}>
          {displayCfg.subtitle}
        </p>

        {/* Underline */}
        <div
          className={`mx-auto mt-6 h-0.5 w-24 rounded-full bg-gradient-to-r from-transparent via-current to-transparent opacity-50 ${displayCfg.titleColor} animate-fade-in stagger-5`}
        />
      </div>
    </div>
  )
}
