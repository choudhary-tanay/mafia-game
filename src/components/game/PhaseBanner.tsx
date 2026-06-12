import type { ReactNode } from 'react'
import type { GamePhase } from '@/types/database'
import { Sunrise } from 'lucide-react'
import {
  MoonScene, HourglassIcon, VillagerGroup,
  BallotBox, SkullMark, TrophyIcon,
} from '@/components/ui/illustrations'

type PhaseCfg = {
  icon: ReactNode
  title: string
  subtitle: string
  border: string
  bg: string
  accentColor: string
}

const CFG: Partial<Record<GamePhase, PhaseCfg>> = {
  NIGHT_ACTIONS_OPEN: {
    icon: <MoonScene size={40} className="text-blue-300 animate-float" />,
    title: 'Night Falls',
    subtitle: 'The village sleeps. Hidden roles make their move.',
    border: 'border-blue-800/50',
    bg: 'bg-gradient-to-r from-blue-950/40 to-indigo-950/30',
    accentColor: 'text-blue-300',
  },
  NIGHT_RESOLUTION: {
    icon: <HourglassIcon size={36} className="text-blue-400 animate-float" />,
    title: 'Resolving Night…',
    subtitle: 'The darkness holds its secrets for just a moment longer.',
    border: 'border-blue-800/40',
    bg: 'bg-blue-950/20',
    accentColor: 'text-blue-400',
  },
  DAY_ANNOUNCEMENT: {
    icon: <Sunrise size={36} strokeWidth={1.75} className="text-amber-300" />,
    title: 'Morning Arrives',
    subtitle: 'The village stirs. What happened in the night?',
    border: 'border-amber-700/40',
    bg: 'bg-gradient-to-r from-amber-950/30 to-orange-950/20',
    accentColor: 'text-amber-300',
  },
  DISCUSSION: {
    icon: <VillagerGroup size={40} className="text-amber-300" />,
    title: 'Discussion',
    subtitle: 'Debate, accuse, defend. Find the Mafia before they strike again.',
    border: 'border-amber-700/40',
    bg: 'bg-gradient-to-r from-amber-950/25 to-yellow-950/15',
    accentColor: 'text-amber-300',
  },
  VOTING: {
    icon: <BallotBox size={40} className="text-red-300" />,
    title: 'Cast Your Vote',
    subtitle: 'Choose carefully. The village will act on your decision.',
    border: 'border-red-800/50',
    bg: 'bg-gradient-to-r from-red-950/40 to-rose-950/30',
    accentColor: 'text-red-300',
  },
  VOTE_RESOLUTION: {
    icon: <SkullMark size={36} className="text-red-400" />,
    title: 'Votes Are In',
    subtitle: 'The village has spoken. The results are being tallied.',
    border: 'border-red-800/40',
    bg: 'bg-red-950/25',
    accentColor: 'text-red-400',
  },
  GAME_OVER: {
    icon: <TrophyIcon size={36} className="text-gold" />,
    title: 'Game Over',
    subtitle: 'The dust has settled. See who was who.',
    border: 'border-border',
    bg: 'bg-surface-raised',
    accentColor: 'text-text-muted',
  },
}

export default function PhaseBanner({ phase, round }: { phase: GamePhase; round: number }) {
  const cfg = CFG[phase]
  if (!cfg) return null

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${cfg.border} ${cfg.bg} px-5 py-4 animate-fade-up`}>
      <div className="relative z-10 flex items-center gap-4">
        <div className="flex w-12 items-center justify-center flex-shrink-0" aria-hidden="true">
          {cfg.icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-bold uppercase tracking-widest ${cfg.accentColor}`}>
              {round > 0 ? `Round ${round}` : 'Game'}
            </span>
          </div>
          <h2 className="font-display text-2xl tracking-wider text-text-primary leading-none">{cfg.title}</h2>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{cfg.subtitle}</p>
        </div>
      </div>
    </div>
  )
}
